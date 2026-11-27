export type OtpChannel = "email" | "sms" | "telegram";

export interface SendOtpPayload {
  identifier: string;
  channel?: OtpChannel;
  length?: 4 | 6;
  purpose?: "login" | "signup" | "reset" | "verify";
}

export interface SendOtpResponse {
  ok: boolean;
  message: string;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
  remainingResends?: number;
  maskedIdentifier?: string;
  deliveredVia?: string;
  demoCode?: string;
}

export interface VerifyOtpPayload {
  identifier: string;
  code: string;
  purpose?: "login" | "signup" | "reset" | "verify";
}

export interface VerifyOtpResponse {
  ok: boolean;
  message: string;
  verified?: boolean;
  token?: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
}

export interface ResendOtpPayload {
  identifier: string;
  channel?: OtpChannel;
  length?: 4 | 6;
  purpose?: "login" | "signup" | "reset" | "verify";
}

function getApiBaseUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const viteUrl =
      (import.meta.env.VITE_API_URL as string | undefined) ||
      (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined);
    if (viteUrl) return viteUrl.replace(/\/$/, "");
  }
  return "";
}

/**
 * POST /api/auth/otp/send
 * Generates a 4 or 6 digit numeric OTP, stores SHA-256 + salt hash with 5-minute expiry,
 * enforces rate limit (max 3 sends per 10 minutes per user/IP), and dispatches via Email / SMS / Telegram.
 */
export async function sendOtp(payload: SendOtpPayload): Promise<SendOtpResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      identifier: payload.identifier,
      channel: payload.channel ?? (payload.identifier.includes("@") ? "email" : "sms"),
      length: payload.length ?? 4,
      purpose: payload.purpose ?? "verify",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<SendOtpResponse>;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to send verification code.");
  }

  return {
    ok: true,
    message: data.message || "Verification code sent.",
    expiresInSeconds: data.expiresInSeconds ?? 300,
    resendCooldownSeconds: data.resendCooldownSeconds ?? 30,
    remainingResends: data.remainingResends ?? 2,
    maskedIdentifier: data.maskedIdentifier,
    deliveredVia: data.deliveredVia,
    demoCode: data.demoCode,
  };
}

/**
 * POST /api/auth/otp/verify
 * Compares SHA-256 + salt hash of submitted OTP, enforces max 5 wrong attempts (locks 15 min),
 * deletes/marks used on success, and sets an httpOnly, Secure, SameSite=Lax session cookie.
 */
export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      identifier: payload.identifier,
      code: payload.code,
      purpose: payload.purpose ?? "verify",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<VerifyOtpResponse>;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "That code didn't match. Try again.");
  }

  return {
    ok: true,
    verified: true,
    message: data.message || "Your account has been verified.",
    token: data.token,
  };
}

/**
 * POST /api/auth/otp/resend
 * Re-sends a fresh OTP while enforcing the 3-sends-per-10-min rate limit and 30-second cooldown.
 */
export async function resendOtp(payload: ResendOtpPayload): Promise<SendOtpResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/auth/otp/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      identifier: payload.identifier,
      channel: payload.channel ?? (payload.identifier.includes("@") ? "email" : "sms"),
      length: payload.length ?? 4,
      purpose: payload.purpose ?? "verify",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<SendOtpResponse>;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Too many attempts, try again later.");
  }

  return {
    ok: true,
    message: data.message || "Code sent",
    expiresInSeconds: data.expiresInSeconds ?? 300,
    resendCooldownSeconds: data.resendCooldownSeconds ?? 30,
    remainingResends: data.remainingResends ?? 1,
    maskedIdentifier: data.maskedIdentifier,
    deliveredVia: data.deliveredVia,
    demoCode: data.demoCode,
  };
}
