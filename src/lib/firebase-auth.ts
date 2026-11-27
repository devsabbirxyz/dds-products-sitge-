import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { DIGISTORE_CONFIG } from "@/config/auth-config";
import { supabase } from "@/integrations/supabase/client";

export interface DigiStoreUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  provider: "google" | "telegram" | "email" | "sandbox";
  emailVerified: boolean;
  createdAt?: string;
}

const LOCAL_STORAGE_KEY = "digistore_user";
const REGISTERED_USERS_KEY = "digistore_registered_users";
const AUTH_EVENT_KEY = "digistore_auth_state_changed";
const DEMO_PLACEHOLDER_EMAILS = new Set([
  "taxonaj676@digeros.com",
  "verified@dds-digital.com",
  "s•••••@gmail.com",
]);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

// Determine if user has substituted the placeholder API key
function isPlaceholderConfig(): boolean {
  const key = DIGISTORE_CONFIG.firebase.apiKey;
  return (
    !key ||
    key.includes("YOUR_FIREBASE_API_KEY_HERE") ||
    key.trim() === "" ||
    DIGISTORE_CONFIG.firebase.projectId.includes("digistore-marketplace")
  );
}

// Initialize Firebase client safely
export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;

  if (firebaseAuth) return firebaseAuth;

  try {
    if (!firebaseApp) {
      if (getApps().length > 0) {
        firebaseApp = getApps()[0];
      } else {
        firebaseApp = initializeApp(DIGISTORE_CONFIG.firebase);
      }
    }
    firebaseAuth = getAuth(firebaseApp);
    return firebaseAuth;
  } catch (err) {
    console.warn("[DigiStore Firebase] Initialization notice:", err);
    return null;
  }
}

export function getRegisteredUsersMap(): Record<string, DigiStoreUser> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function recordRegisteredUserLocally(user: DigiStoreUser): void {
  if (typeof window === "undefined" || !user?.email) return;
  const cleanEmail = user.email.trim().toLowerCase();
  if (
    !cleanEmail ||
    !cleanEmail.includes("@") ||
    DEMO_PLACEHOLDER_EMAILS.has(cleanEmail)
  ) {
    return;
  }
  try {
    const map = getRegisteredUsersMap();
    map[cleanEmail] = {
      ...map[cleanEmail],
      ...user,
      email: cleanEmail,
    };
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export function isEmailRegisteredLocally(rawEmail: string): boolean {
  if (typeof window === "undefined") return false;
  const cleanEmail = (rawEmail || "").trim().toLowerCase();
  if (
    !cleanEmail ||
    !cleanEmail.includes("@") ||
    DEMO_PLACEHOLDER_EMAILS.has(cleanEmail)
  ) {
    return false;
  }

  const map = getRegisteredUsersMap();
  if (map[cleanEmail]) {
    return true;
  }

  // Also check currently active digistore_user session and remembered login email
  try {
    const activeRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (activeRaw) {
      const activeUser = JSON.parse(activeRaw) as DigiStoreUser;
      const activeEmail = (activeUser?.email || "").trim().toLowerCase();
      if (activeEmail && activeEmail === cleanEmail) {
        recordRegisteredUserLocally(activeUser);
        return true;
      }
    }
  } catch {
    // ignore
  }

  return false;
}

export async function isEmailAlreadyRegistered(rawEmail: string): Promise<boolean> {
  const cleanEmail = (rawEmail || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return false;

  if (isEmailRegisteredLocally(cleanEmail)) {
    return true;
  }

  try {
    const { data } = await supabase
      .from("users")
      .select("id, email")
      .ilike("email", cleanEmail)
      .limit(1);
    if (data && data.length > 0) {
      return true;
    }
  } catch {
    // ignore if table not accessible
  }

  return false;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUserUuid(candidateId: string | undefined, seed: string): string {
  if (candidateId && UUID_V4_REGEX.test(candidateId.trim())) {
    return candidateId.trim().toLowerCase();
  }
  const clean = (seed || candidateId || "digistore_user").trim().toLowerCase();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0") +
    ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0") +
    ((h1 + h2) >>> 0).toString(16).padStart(8, "0")
  ).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Save active session locally
export function saveLocalUser(user: DigiStoreUser | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    const normalizedUser: DigiStoreUser = {
      ...user,
      id: normalizeUserUuid(user.id, user.email || user.displayName),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedUser));
    recordRegisteredUserLocally(normalizedUser);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: normalizedUser }));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_KEY, { detail: null }));
  }
}

// Retrieve active session locally
export function getLocalUser(): DigiStoreUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DigiStoreUser;
    if (parsed && parsed.id && !UUID_V4_REGEX.test(parsed.id)) {
      parsed.id = normalizeUserUuid(parsed.id, parsed.email || parsed.displayName);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Sign in with Google via Firebase Popup (GoogleAuthProvider) or real Supabase Google OAuth
 */
export async function signInWithGoogle(redirectDest = "/dashboard"): Promise<{ user: DigiStoreUser | null; redirecting?: boolean }> {
  const auth = getFirebaseAuth();

  // 1. If live Firebase credentials configured, execute real Firebase Google popup
  if (auth && !isPlaceholderConfig()) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const firebaseUser: User = result.user;

      const digiUser: DigiStoreUser = {
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "Google User",
        photoURL: firebaseUser.photoURL || undefined,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        provider: "google",
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date().toISOString(),
      };

      saveLocalUser(digiUser);
      return { user: digiUser };
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        throw new Error("Google sign-in popup was closed before completing.");
      }
      if (err.code === "auth/cancelled-popup-request") {
        throw new Error("Google sign-in was cancelled.");
      }
      if (err.code === "auth/popup-blocked") {
        throw new Error("Popup blocked by browser. Please allow popups for this site.");
      }
      if (err.code === "auth/network-request-failed") {
        throw new Error("Network connection error. Please check your internet connection.");
      }
      throw new Error(err.message || "Google authentication failed.");
    }
  }

  // 2. Otherwise, launch real Google Account Chooser via Supabase OAuth (NO fake auto-login!)
  const { error: oauthErr } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${redirectDest}`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (oauthErr) {
    throw new Error(
      oauthErr.message ||
        "Google Sign-In চালু করতে Firebase অথবা Supabase-এ Google Provider এনাবল করুন।"
    );
  }

  return { user: null, redirecting: true };
}

/**
 * Sign in with Email and Password via Firebase
 */
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ user: DigiStoreUser; isSandbox?: boolean }> {
  const auth = getFirebaseAuth();
  const cleanEmail = email.trim().toLowerCase();

  if (auth && !isPlaceholderConfig()) {
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const u = cred.user;

      const digiUser: DigiStoreUser = {
        id: u.uid,
        email: u.email || cleanEmail,
        displayName: u.displayName || cleanEmail.split("@")[0],
        photoURL: u.photoURL || undefined,
        provider: "email",
        emailVerified: u.emailVerified,
        createdAt: new Date().toISOString(),
      };

      saveLocalUser(digiUser);
      return { user: digiUser };
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        throw new Error("Invalid email or password. Please verify your credentials.");
      }
      if (err.code === "auth/too-many-requests") {
        throw new Error("Too many failed login attempts. Please reset your password or try again later.");
      }
      if (err.code === "auth/user-disabled") {
        throw new Error("This account has been disabled. Please contact support.");
      }
      throw new Error(err.message || "Login failed. Please try again.");
    }
  }

  // Resilient Sandbox Mode
  await new Promise((res) => setTimeout(res, 750));

  const existingRegistered = getRegisteredUsersMap()[cleanEmail];

  const demoUser: DigiStoreUser = existingRegistered || {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "00000000-0000-4000-8000-000000000001",
    email: cleanEmail,
    displayName: cleanEmail
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80",
    provider: "email",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  saveLocalUser(demoUser);
  return { user: demoUser, isSandbox: true };
}

/**
 * Sign up with Email, Password, Full Name, and optional Phone via Firebase
 */
export async function signUpWithEmail(
  fullName: string,
  email: string,
  pass: string,
  phone?: string
): Promise<{ user: DigiStoreUser; isSandbox?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();

  // Block creating a duplicate account if an account with this email already exists
  if (await isEmailAlreadyRegistered(cleanEmail)) {
    throw new Error(
      "এই জিমেইল/ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে! নতুন অ্যাকাউন্ট না খুলে অনুগ্রহ করে লগইন করুন।"
    );
  }

  const auth = getFirebaseAuth();

  if (auth && !isPlaceholderConfig()) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const u = cred.user;

      if (fullName) {
        await updateProfile(u, { displayName: fullName });
      }

      // Send Firebase Email Verification
      try {
        await sendEmailVerification(u);
      } catch (e) {
        console.warn("Could not send email verification immediately:", e);
      }

      const digiUser: DigiStoreUser = {
        id: u.uid,
        email: u.email || cleanEmail,
        displayName: fullName || u.displayName || cleanEmail.split("@")[0],
        photoURL: u.photoURL || undefined,
        phoneNumber: phone,
        provider: "email",
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };

      saveLocalUser(digiUser);
      return { user: digiUser };
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        throw new Error(
          "এই জিমেইল/ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে! নতুন অ্যাকাউন্ট না খুলে অনুগ্রহ করে লগইন করুন।"
        );
      }
      if (err.code === "auth/invalid-email") {
        throw new Error("The provided email address is invalid.");
      }
      if (err.code === "auth/weak-password") {
        throw new Error("The password is too weak. Please use at least 8 characters with letters, numbers, and symbols.");
      }
      throw new Error(err.message || "Failed to create account. Please try again.");
    }
  }

  // Sandbox Mode
  await new Promise((res) => setTimeout(res, 650));
  const demoUser: DigiStoreUser = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "00000000-0000-4000-8000-000000000002",
    email: cleanEmail,
    displayName: fullName.trim() || cleanEmail.split("@")[0],
    phoneNumber: phone,
    photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&q=80",
    provider: "email",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  saveLocalUser(demoUser);
  return { user: demoUser, isSandbox: true };
}

/**
 * Send Password Reset Email via Firebase
 */
export async function sendResetPassword(email: string): Promise<boolean> {
  const auth = getFirebaseAuth();

  if (auth && !isPlaceholderConfig()) {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        // Return true to avoid email enumeration attack while protecting security
        return true;
      }
      throw new Error(err.message || "Unable to send reset password email.");
    }
  }

  // Sandbox Mode
  await new Promise((res) => setTimeout(res, 600));
  return true;
}

/**
 * Handle Telegram Authentication Callback
 *
 * NOTE: For full production security:
 * The auth hash MUST be verified on a backend server using your bot token.
 * We include the full signature data structure so backend endpoints can verify it directly.
 */
export interface TelegramAuthData {
  id: number;
  custom_id?: string;
  first_name: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export async function handleTelegramAuth(data: TelegramAuthData): Promise<DigiStoreUser> {
  // Construct clean user profile with real Gmail, Phone Number, and Telegram Profile Picture
  const fullName =
    [data.first_name, data.last_name].filter(Boolean).join(" ") ||
    data.username ||
    "Telegram User";
  const email =
    data.email && data.email.includes("@")
      ? data.email.trim().toLowerCase()
      : data.username
        ? `${data.username.toLowerCase()}@telegram.org`
        : `tg_${data.id}@telegram.org`;

  const digiUser: DigiStoreUser = {
    id: data.custom_id || `tg_${data.id}`,
    email,
    displayName: fullName,
    photoURL: data.photo_url,
    phoneNumber: data.phone_number,
    provider: "telegram",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  saveLocalUser(digiUser);
  return digiUser;
}

/**
 * Log out active user from both Firebase and Local session
 */
export async function logoutDigiStoreUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut errors
    }
  }
  saveLocalUser(null);
}

