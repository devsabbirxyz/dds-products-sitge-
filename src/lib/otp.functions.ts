import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  generateOtpCode,
  createSignedOtpChallenge,
  verifySignedOtpChallenge,
  buildOtpEmailHtml,
  normalizeOtpDigits,
  hashPasswordSha256,
  ensureValidUuid,
  type OtpPurpose,
} from "./otp-utils";

export interface StoredServerAccount {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  provider: "email" | "google" | "telegram";
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

const usedChallenges = new Map<string, number>();
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const registeredEmailsCache = new Set<string>();
const serverAccountsCache = new Map<string, StoredServerAccount>();

function cleanupCaches(now = Date.now()) {
  for (const [k, exp] of usedChallenges.entries()) {
    if (now > exp) usedChallenges.delete(k);
  }
  for (const [k, info] of failedAttempts.entries()) {
    if (now > info.resetAt) failedAttempts.delete(k);
  }
}

async function loadRegisteredEmailsSet(): Promise<Set<string>> {
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["registered_user_emails", "telegram_known_users"]);
    for (const row of data ?? []) {
      if (row.key === "registered_user_emails" && row.value) {
        const list = JSON.parse(row.value) as string[];
        if (Array.isArray(list)) {
          for (const em of list) {
            if (typeof em === "string" && em.includes("@")) {
              registeredEmailsCache.add(em.trim().toLowerCase());
            }
          }
        }
      } else if (row.key === "telegram_known_users" && row.value) {
        const map = JSON.parse(row.value) as Record<string, { email?: string }>;
        for (const entry of Object.values(map || {})) {
          if (entry?.email && entry.email.includes("@")) {
            registeredEmailsCache.add(entry.email.trim().toLowerCase());
          }
        }
      }
    }
  } catch {
    // ignore db read errors
  }
  return registeredEmailsCache;
}

async function isEmailAlreadyRegisteredServer(rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return false;

  if (registeredEmailsCache.has(email)) {
    return true;
  }

  const cachedSet = await loadRegisteredEmailsSet();
  if (cachedSet.has(email)) {
    return true;
  }

  // Check Supabase public.users table
  try {
    const { data: existingRows } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .ilike("email", email)
      .limit(1);
    if (existingRows && existingRows.length > 0) {
      registeredEmailsCache.add(email);
      return true;
    }
  } catch {
    // ignore if table query fails
  }

  // Check Supabase Auth users if service role is configured
  try {
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const found = authList?.users?.some(
      (u) => (u.email || "").trim().toLowerCase() === email
    );
    if (found) {
      registeredEmailsCache.add(email);
      return true;
    }
  } catch {
    // ignore if service role key is not configured
  }

  return false;
}

async function loadServerAccountsMap(): Promise<Record<string, StoredServerAccount>> {
  const result: Record<string, StoredServerAccount> = {};
  for (const [k, v] of serverAccountsCache.entries()) {
    result[k] = v;
  }
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "registered_user_accounts")
      .maybeSingle();
    if (data?.value) {
      const parsed = JSON.parse(data.value) as Record<string, StoredServerAccount>;
      for (const [rawKey, acc] of Object.entries(parsed || {})) {
        const cleanKey = rawKey.trim().toLowerCase();
        if (cleanKey && acc?.email) {
          result[cleanKey] = acc;
          serverAccountsCache.set(cleanKey, acc);
          registeredEmailsCache.add(cleanKey);
        }
      }
    }
  } catch {
    // ignore db read errors
  }
  return result;
}

async function persistServerAccount(account: StoredServerAccount): Promise<void> {
  const cleanEmail = account.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return;
  serverAccountsCache.set(cleanEmail, account);
  registeredEmailsCache.add(cleanEmail);

  try {
    const map = await loadServerAccountsMap();
    map[cleanEmail] = account;
    await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          key: "registered_user_accounts",
          value: JSON.stringify(map),
          group_name: "auth",
        },
        { onConflict: "key" }
      );
  } catch {
    // ignore db write errors
  }
}

async function recordRegisteredEmailServer(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return;
  registeredEmailsCache.add(email);

  try {
    const currentSet = await loadRegisteredEmailsSet();
    currentSet.add(email);
    await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          key: "registered_user_emails",
          value: JSON.stringify(Array.from(currentSet)),
          group_name: "auth",
        },
        { onConflict: "key" }
      );
  } catch {
    // ignore db write errors
  }
}

function getOtpSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "dds-digital-custom-otp-hmac-secret-2026"
  );
}

interface OtpConfig {
  siteName: string;
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  gasWebhookUrl: string;
  resendApiKey: string;
  resendFrom: string;
  telegramMirror: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  telegramOtpBotToken: string;
}

const DEFAULT_OTP_BOT_TOKEN = "9025719963:AAEE3GRNZqUk1dtWeItdKyznlNR32FykbfU";
const BANNED_OTP_BOT_PREFIX = "9120839940:";

function sanitizeOtpBotToken(raw?: string): string {
  const clean = (raw || "").trim();
  if (!clean || clean.startsWith(BANNED_OTP_BOT_PREFIX)) {
    return DEFAULT_OTP_BOT_TOKEN;
  }
  return clean;
}

function getCustomerOtpBotToken(cfg: OtpConfig): string {
  return sanitizeOtpBotToken(cfg.telegramOtpBotToken);
}

async function loadOtpConfig(): Promise<OtpConfig> {
  const keys = [
    "site_name",
    "otp_signup_enabled",
    "otp_smtp_host",
    "otp_smtp_port",
    "otp_smtp_user",
    "otp_smtp_pass",
    "otp_gas_webhook_url",
    "otp_resend_api_key",
    "otp_resend_from",
    "otp_telegram_mirror",
    "telegram_bot_token",
    "telegram_chat_id",
    "telegram_otp_bot_token",
  ];
  const map: Record<string, string> = {};
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("key,value")
      .in("key", keys);
    for (const row of data ?? []) {
      map[row.key] = row.value ?? "";
    }
  } catch {
    // fallback to defaults/env
  }

  return {
    siteName: map.site_name || "DDS-Digital",
    enabled: (map.otp_signup_enabled ?? "1") !== "0",
    smtpHost: (map.otp_smtp_host || process.env.SMTP_HOST || "smtp.gmail.com").trim(),
    smtpPort: Number(map.otp_smtp_port || process.env.SMTP_PORT || "465") || 465,
    smtpUser: (map.otp_smtp_user || process.env.SMTP_USER || "").trim(),
    smtpPass: (map.otp_smtp_pass || process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    gasWebhookUrl: (map.otp_gas_webhook_url || process.env.GAS_EMAIL_WEBHOOK_URL || "").trim(),
    resendApiKey: (map.otp_resend_api_key || process.env.RESEND_API_KEY || "").trim(),
    resendFrom: (
      map.otp_resend_from ||
      process.env.RESEND_FROM_EMAIL ||
      "DDS-Digital <onboarding@resend.dev>"
    ).trim(),
    telegramMirror: (map.otp_telegram_mirror ?? "1") !== "0",
    telegramBotToken: sanitizeOtpBotToken(map.telegram_bot_token || map.telegram_otp_bot_token),
    telegramChatId: (map.telegram_chat_id || "7381429003").trim(),
    telegramOtpBotToken: sanitizeOtpBotToken(map.telegram_otp_bot_token),
  };
}

async function sendOtpEmailViaProviders(
  cfg: OtpConfig,
  params: {
    to: string;
    recipientName?: string;
    code: string;
    purpose: OtpPurpose;
  },
): Promise<{
  deliveredVia: "smtp" | "gas_webhook" | "resend" | "telegram_only" | "sandbox";
  providerWarning?: string;
}> {
  const { subject, html, text } = buildOtpEmailHtml({
    siteName: cfg.siteName,
    recipientEmail: params.to,
    recipientName: params.recipientName,
    code: params.code,
    purpose: params.purpose,
  });

  const errors: string[] = [];

  // 1. Try Gmail / Custom SMTP via Nodemailer
  if (cfg.smtpUser && cfg.smtpPass) {
    try {
      const secure = cfg.smtpPort === 465;
      const transporter = nodemailer.createTransport({
        host: cfg.smtpHost || "smtp.gmail.com",
        port: cfg.smtpPort || 465,
        secure,
        auth: {
          user: cfg.smtpUser,
          pass: cfg.smtpPass,
        },
      });
      await transporter.sendMail({
        from: `"${cfg.siteName}" <${cfg.smtpUser}>`,
        to: params.to,
        subject,
        text,
        html,
      });
      await mirrorOtpToTelegram(cfg, params);
      return { deliveredVia: "smtp" };
    } catch (err: any) {
      errors.push(`SMTP: ${err?.message || "Failed"}`);
    }
  }

  // 2. Try Google Apps Script Free Gmail Bridge
  if (cfg.gasWebhookUrl && cfg.gasWebhookUrl.startsWith("https://script.google.com/")) {
    try {
      const res = await fetch(cfg.gasWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: params.to,
          subject,
          htmlBody: html,
          textBody: text,
          siteName: cfg.siteName,
        }),
      });
      if (res.ok) {
        await mirrorOtpToTelegram(cfg, params);
        return { deliveredVia: "gas_webhook" };
      }
      errors.push(`Google Apps Script: HTTP ${res.status}`);
    } catch (err: any) {
      errors.push(`Google Apps Script: ${err?.message || "Failed"}`);
    }
  }

  // 3. Try Resend Free API
  if (cfg.resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: cfg.resendFrom || `${cfg.siteName} <onboarding@resend.dev>`,
          to: [params.to],
          subject,
          html,
          text,
        }),
      });
      if (res.ok) {
        await mirrorOtpToTelegram(cfg, params);
        return { deliveredVia: "resend" };
      }
      const body: any = await res.json().catch(() => ({}));
      errors.push(`Resend: ${body?.message || `HTTP ${res.status}`}`);
    } catch (err: any) {
      errors.push(`Resend: ${err?.message || "Failed"}`);
    }
  }

  // 4. Mirror to Telegram if configured
  const tgSent = await mirrorOtpToTelegram(cfg, params);

  return {
    deliveredVia: tgSent ? "telegram_only" : "sandbox",
    providerWarning: errors.length > 0 ? errors.join(" | ") : undefined,
  };
}

async function mirrorOtpToTelegram(
  cfg: OtpConfig,
  params: { to: string; recipientName?: string; code: string; purpose: OtpPurpose },
): Promise<boolean> {
  if (!cfg.telegramMirror || !cfg.telegramChatId) return false;
  const label =
    params.purpose === "reset"
      ? "🔐 পাসওয়ার্ড রিসেট OTP"
      : params.purpose === "login"
        ? "🔑 গুগল/ইমেইল লগইন OTP"
        : params.purpose === "test"
          ? "🧪 টেস্ট OTP"
          : "📧 নতুন সাইনআপ OTP";
  const text = `${label}\n👤 নাম: ${params.recipientName || "N/A"}\n📨 ইমেইল: ${params.to}\n🔢 OTP কোড: <code>${params.code}</code>`;

  const tokens = Array.from(
    new Set([cfg.telegramOtpBotToken, cfg.telegramBotToken].filter(Boolean))
  );
  let anySent = false;

  for (const token of tokens) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: cfg.telegramChatId,
            text,
            parse_mode: "HTML",
          }),
        },
      );
      if (res.ok) {
        anySent = true;
      }
    } catch {
      // ignore individual bot error
    }
  }
  return anySent;
}

const requestOtpSchema = z.object({
  email: z.string().email("সঠিক ইমেইল ঠিকানা দিন").max(255),
  fullName: z.string().max(200).optional(),
  purpose: z.enum(["signup", "login", "reset", "test"]).default("signup"),
});

export const requestEmailOtpServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestOtpSchema.parse(d))
  .handler(async ({ data }) => {
    cleanupCaches();
    const email = data.email.trim().toLowerCase();

    // Prevent creating a second account with an already-registered Gmail/Email
    if (data.purpose === "signup") {
      const alreadyExists = await isEmailAlreadyRegisteredServer(email);
      if (alreadyExists) {
        return {
          ok: false as const,
          code: "EMAIL_EXISTS" as const,
          error:
            "এই জিমেইল/ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে! নতুন অ্যাকাউন্ট না খুলে অনুগ্রহ করে লগইন করুন।",
          email,
          challengeToken: "",
          expiresAt: 0,
          deliveredVia: "sandbox" as const,
          providerWarning: undefined,
          sandboxCode: undefined,
        };
      }
    }

    const cfg = await loadOtpConfig();
    const code = generateOtpCode();
    const secret = getOtpSecret();

    const { challengeToken, expiresAt } = createSignedOtpChallenge({
      email,
      code,
      purpose: data.purpose,
      secret,
      ttlMs: 10 * 60 * 1000, // 10 minutes
    });

    const delivery = await sendOtpEmailViaProviders(cfg, {
      to: email,
      recipientName: data.fullName,
      code,
      purpose: data.purpose,
    });

    const isLiveEmail =
      delivery.deliveredVia === "smtp" ||
      delivery.deliveredVia === "gas_webhook" ||
      delivery.deliveredVia === "resend";

    return {
      ok: true as const,
      code: "OTP_SENT" as const,
      error: undefined,
      email,
      challengeToken,
      expiresAt,
      deliveredVia: delivery.deliveredVia,
      providerWarning: delivery.providerWarning,
      // When no SMTP / GAS / Resend credentials are set yet, provide sandboxCode so testing works out-of-the-box.
      // As soon as Gmail SMTP / Google Apps Script / Resend is configured, sandboxCode is omitted.
      sandboxCode: isLiveEmail ? undefined : code,
    };
  });

export const registerEmailAccountServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(255),
        fullName: z.string().max(200).optional(),
        phone: z.string().max(40).optional(),
        password: z.string().max(200).optional(),
        avatarUrl: z.string().max(2000).optional(),
        provider: z.enum(["email", "google", "telegram"]).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    await recordRegisteredEmailServer(email);

    const existingMap = await loadServerAccountsMap();
    const prev = existingMap[email];
    const nowIso = new Date().toISOString();

    const account: StoredServerAccount = {
      id: ensureValidUuid(prev?.id, email),
      email,
      fullName:
        data.fullName?.trim() ||
        prev?.fullName ||
        email.split("@")[0].replace(/[._-]/g, " "),
      phone: data.phone?.trim() || prev?.phone,
      avatarUrl: data.avatarUrl || prev?.avatarUrl,
      provider: data.provider || prev?.provider || "email",
      passwordHash: data.password
        ? hashPasswordSha256(data.password, email)
        : prev?.passwordHash,
      createdAt: prev?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await persistServerAccount(account);

    return {
      ok: true as const,
      email,
      user: {
        id: account.id,
        email: account.email,
        displayName: account.fullName,
        phoneNumber: account.phone,
        photoURL: account.avatarUrl,
        provider: account.provider,
      },
    };
  });

export const getGoogleChooserAccountsServer = createServerFn({ method: "GET" }).handler(
  async () => {
    const accountsMap = await loadServerAccountsMap();
    const list: Array<{
      id: string;
      email: string;
      displayName: string;
      photoURL?: string;
      phoneNumber?: string;
    }> = [];
    const seen = new Set<string>();

    const isAutomatedTestEmail = (em: string) =>
      /^(strict_otp_test_|test_|demo_|verify_|user\d+@)/i.test(em) ||
      em.endsWith("@telegram.org") ||
      em.endsWith("@digeros.com") ||
      em.endsWith("@dds-digital.com");

    for (const acc of Object.values(accountsMap)) {
      const em = (acc?.email || "").trim().toLowerCase();
      if (!em || !em.includes("@") || seen.has(em) || isAutomatedTestEmail(em)) {
        continue;
      }
      seen.add(em);
      list.push({
        id: ensureValidUuid(acc.id, em),
        email: em,
        displayName:
          acc.fullName ||
          em
            .split("@")[0]
            .replace(/[._-]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        photoURL: acc.avatarUrl,
        phoneNumber: acc.phone,
      });
    }

    try {
      const knownTg = await loadKnownTgUsers();
      for (const tg of Object.values(knownTg)) {
        const em = (tg?.email || "").trim().toLowerCase();
        if (!em || !em.includes("@") || seen.has(em) || isAutomatedTestEmail(em)) {
          continue;
        }
        seen.add(em);
        const fullName =
          [tg.firstName, tg.lastName].filter(Boolean).join(" ") ||
          tg.username ||
          em.split("@")[0];
        list.push({
          id: ensureValidUuid(tg.supabaseUserId, em),
          email: em,
          displayName: fullName,
          photoURL: tg.avatarUrl,
          phoneNumber: tg.phone,
        });
      }
    } catch {
      // ignore
    }

    return { accounts: list.slice(0, 6) };
  }
);

export const verifyEmailPasswordLoginServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(255),
        password: z.string().min(1).max(200),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const accounts = await loadServerAccountsMap();
    const acc = accounts[email];

    if (acc) {
      if (acc.passwordHash) {
        const candidateHash = hashPasswordSha256(data.password, email);
        if (candidateHash !== acc.passwordHash) {
          return {
            ok: false as const,
            code: "WRONG_PASSWORD" as const,
            error: "পাসওয়ার্ড সঠিক নয়! সঠিক পাসওয়ার্ড দিন অথবা Forgot password ব্যবহার করুন।",
          };
        }
      }
      return {
        ok: true as const,
        user: {
          id: ensureValidUuid(acc.id, email),
          email: acc.email,
          displayName: acc.fullName,
          phoneNumber: acc.phone,
          photoURL: acc.avatarUrl,
          provider: acc.provider,
        },
      };
    }

    // Check if email exists in known Telegram users or registered emails
    const exists = await isEmailAlreadyRegisteredServer(email);
    if (!exists) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        error: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে আগে Sign up করুন।",
      };
    }

    // Account existed before password hashes were stored: record current password hash for future logins
    const nowIso = new Date().toISOString();
    const migrated: StoredServerAccount = {
      id: ensureValidUuid(undefined, email),
      email,
      fullName: email.split("@")[0].replace(/[._-]/g, " "),
      provider: "email",
      passwordHash: hashPasswordSha256(data.password, email),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await persistServerAccount(migrated);

    return {
      ok: true as const,
      user: {
        id: migrated.id,
        email: migrated.email,
        displayName: migrated.fullName,
        provider: migrated.provider,
      },
    };
  });

export const resetUserPasswordServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        emailOrIdentifier: z.string().min(2).max(255),
        newPassword: z.string().min(6).max(200),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const raw = data.emailOrIdentifier.trim().toLowerCase();
    let targetEmail = raw.includes("@") && !raw.startsWith("@") ? raw : "";

    if (!targetEmail) {
      const cleanTg = raw.replace(/^@/, "");
      const knownUsers = await loadKnownTgUsers();
      const matchedTg = knownUsers[cleanTg];
      if (matchedTg?.email) {
        targetEmail = matchedTg.email.trim().toLowerCase();
      }
    }

    if (targetEmail && targetEmail.includes("@")) {
      const accounts = await loadServerAccountsMap();
      const prev = accounts[targetEmail];
      const nowIso = new Date().toISOString();
      const updated: StoredServerAccount = {
        id: ensureValidUuid(prev?.id, targetEmail),
        email: targetEmail,
        fullName: prev?.fullName || targetEmail.split("@")[0],
        phone: prev?.phone,
        avatarUrl: prev?.avatarUrl,
        provider: prev?.provider || "email",
        passwordHash: hashPasswordSha256(data.newPassword, targetEmail),
        createdAt: prev?.createdAt || nowIso,
        updatedAt: nowIso,
      };
      await persistServerAccount(updated);
      await recordRegisteredEmailServer(targetEmail);
    }

    return { ok: true as const };
  });

const verifyOtpSchema = z.object({
  email: z.string().email().max(255),
  code: z.string().min(1).max(20),
  purpose: z.enum(["signup", "login", "reset", "test"]).default("signup"),
  challengeToken: z.string().min(10).max(300),
});

export const verifyEmailOtpServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyOtpSchema.parse(d))
  .handler(async ({ data }) => {
    cleanupCaches();
    const now = Date.now();
    const email = data.email.trim().toLowerCase();
    const normalizedCode = normalizeOtpDigits(data.code, 6);

    const attemptKey = `${email}:${data.challengeToken}`;
    const attempts = failedAttempts.get(attemptKey);
    if (attempts && attempts.count >= 6 && now < attempts.resetAt) {
      return {
        ok: false as const,
        error: "অতিরিক্ত ভুল চেষ্টার কারণে এই কোডটি ব্লক করা হয়েছে। অনুগ্রহ করে 'পুনরায় কোড পাঠান' বাটনে ক্লিক করুন।",
      };
    }

    if (usedChallenges.has(data.challengeToken)) {
      return {
        ok: false as const,
        error: "এই OTP কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে। নতুন কোড পাঠান।",
      };
    }

    const res = verifySignedOtpChallenge({
      email,
      code: normalizedCode,
      purpose: data.purpose,
      challengeToken: data.challengeToken,
      secret: getOtpSecret(),
      now,
    });

    if (!res.valid) {
      const prev = failedAttempts.get(attemptKey);
      failedAttempts.set(attemptKey, {
        count: (prev?.count ?? 0) + 1,
        resetAt: now + 10 * 60 * 1000,
      });

      if (res.reason === "expired") {
        return {
          ok: false as const,
          error: "⏰ OTP কোডের মেয়াদ শেষ হয়ে গেছে (১০ মিনিট)। অনুগ্রহ করে পুনরায় কোড পাঠান।",
        };
      }
      return {
        ok: false as const,
        error: "❌ OTP কোডটি সঠিক নয়। আপনার ইমেইল চেক করে ৬ সংখ্যার সঠিক কোড দিন।",
      };
    }

    usedChallenges.set(data.challengeToken, now + 15 * 60 * 1000);
    failedAttempts.delete(attemptKey);

    if (data.purpose === "signup") {
      await recordRegisteredEmailServer(email);
    }

    return {
      ok: true as const,
      verifiedAt: now,
    };
  });

// ============================================================================
// TELEGRAM BOT OTP AUTHENTICATION & PASSWORD RESET
// ============================================================================
interface KnownTgUser {
  chatId: string;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  supabaseUserId?: string;
  updatedAt: number;
}

const memoryTgUsers = new Map<string, KnownTgUser>([
  [
    "7381429003",
    {
      chatId: "7381429003",
      firstName: "DeV XaBBiR",
      lastName: "",
      username: "devxabbir",
      updatedAt: Date.now(),
    },
  ],
  [
    "devxabbir",
    {
      chatId: "7381429003",
      firstName: "DeV XaBBiR",
      lastName: "",
      username: "devxabbir",
      updatedAt: Date.now(),
    },
  ],
]);

async function loadKnownTgUsers(): Promise<Record<string, KnownTgUser>> {
  const result: Record<string, KnownTgUser> = {};
  for (const [k, v] of memoryTgUsers.entries()) {
    const cleanKey = k.trim().toLowerCase().replace(/^@/, "");
    result[cleanKey] = v;
  }
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "telegram_known_users")
      .maybeSingle();
    if (data?.value) {
      const parsed = JSON.parse(data.value) as Record<string, KnownTgUser>;
      for (const [k, v] of Object.entries(parsed)) {
        const cleanKey = k.trim().toLowerCase().replace(/^@/, "");
        result[cleanKey] = v;
        memoryTgUsers.set(cleanKey, v);
        if (v?.username) {
          const cleanUname = v.username.trim().toLowerCase().replace(/^@/, "");
          result[cleanUname] = v;
          memoryTgUsers.set(cleanUname, v);
        }
        if (v?.chatId) {
          result[String(v.chatId)] = v;
          memoryTgUsers.set(String(v.chatId), v);
        }
      }
    }
  } catch {
    // ignore db read errors
  }
  return result;
}

async function persistKnownTgUsers(knownUsers: Record<string, KnownTgUser>): Promise<void> {
  for (const [k, v] of Object.entries(knownUsers)) {
    const cleanKey = k.trim().toLowerCase().replace(/^@/, "");
    memoryTgUsers.set(cleanKey, v);
  }
  try {
    await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          key: "telegram_known_users",
          value: JSON.stringify(knownUsers),
          group_name: "telegram",
        },
        { onConflict: "key" }
      );
  } catch {
    // ignore db write errors
  }
}

/**
 * Fetches the user's Telegram profile picture using getUserProfilePhotos + getFile
 * and converts it to a compact base64 Data URL so the Bot Token is never exposed to the client.
 */
async function fetchTelegramUserAvatarDataUrl(
  botToken: string,
  userId: string | number
): Promise<string | undefined> {
  try {
    const photosRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userId}&limit=1`
    );
    const photosJson: any = await photosRes.json().catch(() => ({}));
    const firstPhotoSizes: any[] | undefined = photosJson?.result?.photos?.[0];
    if (!Array.isArray(firstPhotoSizes) || firstPhotoSizes.length === 0) {
      return undefined;
    }

    // Prefer medium thumbnail (160x160 or 320x320) for fast loading & crisp avatar display
    const chosenSize =
      firstPhotoSizes[1] || firstPhotoSizes[0] || firstPhotoSizes[firstPhotoSizes.length - 1];
    const fileId = chosenSize?.file_id;
    if (!fileId) return undefined;

    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const fileJson: any = await fileRes.json().catch(() => ({}));
    const filePath = fileJson?.result?.file_path;
    if (!filePath) return undefined;

    const imgRes = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`
    );
    if (!imgRes.ok) return undefined;

    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const ext = String(filePath).toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return `data:image/${ext};base64,${base64}`;
  } catch {
    return undefined;
  }
}

async function syncTelegramUpdatesAndCacheUsers(
  botToken: string,
  secondaryBotToken?: string
): Promise<{
  updates: any[];
  knownUsers: Record<string, KnownTgUser>;
}> {
  const knownUsers = await loadKnownTgUsers();
  let updates: any[] = [];
  const tokensToPoll = Array.from(
    new Set([botToken, secondaryBotToken].filter(Boolean) as string[])
  );

  let dirty = false;

  for (const token of tokensToPoll) {
    try {
      const upRes = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?limit=100`
      );
      const upJson: any = await upRes.json().catch(() => ({}));
      const botUpdates = upJson?.result ?? [];
      if (token === botToken) {
        updates = botUpdates;
      }

      for (const u of botUpdates) {
        const msg =
          u?.message ||
          u?.edited_message ||
          u?.callback_query?.message ||
          u?.my_chat_member;
        const from = u?.message?.from || u?.callback_query?.from || msg?.chat;
        const chat = msg?.chat || from;
        if (!chat?.id) continue;

        const chatId = String(chat.id);
        const uname = String(from?.username || chat?.username || "")
          .trim()
          .toLowerCase()
          .replace(/^@/, "");
        const firstName = String(
          from?.first_name || chat?.first_name || "Telegram User"
        );
        const lastName = String(from?.last_name || chat?.last_name || "");
        const contactPhone = String(msg?.contact?.phone_number || "").replace(
          /[^0-9+]/g,
          ""
        );

        const prev =
          knownUsers[chatId] || (uname ? knownUsers[uname] : undefined);

        const entry: KnownTgUser = {
          chatId,
          firstName: firstName || prev?.firstName || "Telegram User",
          lastName: lastName || prev?.lastName || "",
          username: uname || prev?.username || `tg_${chatId}`,
          phone: contactPhone || prev?.phone || undefined,
          email: prev?.email || undefined,
          avatarUrl: prev?.avatarUrl || undefined,
          supabaseUserId: prev?.supabaseUserId || undefined,
          updatedAt: Date.now(),
        };

        if (uname) {
          knownUsers[uname] = entry;
          memoryTgUsers.set(uname, entry);
          dirty = true;
        }
        knownUsers[chatId] = entry;
        memoryTgUsers.set(chatId, entry);
        dirty = true;

        const cleanDigits = (entry.phone || "").replace(/[^0-9]/g, "");
        if (cleanDigits && cleanDigits.length >= 8) {
          knownUsers[`phone_${cleanDigits.slice(-8)}`] = entry;
          memoryTgUsers.set(`phone_${cleanDigits.slice(-8)}`, entry);
        }
      }
    } catch {
      // ignore getUpdates errors
    }
  }

  if (dirty) {
    await persistKnownTgUsers(knownUsers);
  }

  return { updates, knownUsers };
}

const requestTgOtpSchema = z.object({
  identifier: z.string().min(2, "টেলিগ্রাম ইউজারনেম বা আইডি দিন").max(120),
  purpose: z.enum(["login", "signup", "reset"]).default("login"),
});

export const requestTelegramBotOtpServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestTgOtpSchema.parse(d))
  .handler(async ({ data }) => {
    cleanupCaches();
    const cfg = await loadOtpConfig();
    const otpBotToken = getCustomerOtpBotToken(cfg);
    const rawInput = data.identifier.trim();
    const cleanUsername = rawInput.replace(/^@/, "").toLowerCase();

    if (!otpBotToken) {
      throw new Error(
        "অ্যাডমিন প্যানেলে এখনো Telegram OTP Bot Token সেট করা হয়নি। অনুগ্রহ করে Admin -> Telegram থেকে OTP বট টোকেন সেট করুন।"
      );
    }

    // 1. Discover bot's own @username via getMe so we can show a direct link to the user
    let botUsername = "";
    try {
      const meRes = await fetch(
        `https://api.telegram.org/bot${otpBotToken}/getMe`
      );
      const meJson: any = await meRes.json().catch(() => ({}));
      if (meJson?.ok && meJson.result?.username) {
        botUsername = meJson.result.username;
      }
    } catch {
      // ignore
    }

    // 2. Sync recent bot updates + check persistent known users cache across both bots
    const { knownUsers } = await syncTelegramUpdatesAndCacheUsers(
      otpBotToken,
      cfg.telegramBotToken
    );

    let resolvedChatId: string | number | null = null;
    let firstName = rawInput.replace(/^@/, "");
    let lastName = "";
    let matchedUsername = cleanUsername;
    let knownEntry: KnownTgUser | undefined;

    const inputDigits = rawInput.replace(/[^0-9]/g, "");
    const byUsername = knownUsers[cleanUsername];
    const byPhone =
      inputDigits.length >= 8 ? knownUsers[`phone_${inputDigits.slice(-8)}`] : undefined;

    if (byUsername) {
      knownEntry = byUsername;
      resolvedChatId = byUsername.chatId;
      firstName = byUsername.firstName || firstName;
      lastName = byUsername.lastName || "";
      matchedUsername = byUsername.username || cleanUsername;
    } else if (byPhone) {
      knownEntry = byPhone;
      resolvedChatId = byPhone.chatId;
      firstName = byPhone.firstName || firstName;
      lastName = byPhone.lastName || "";
      matchedUsername = byPhone.username || cleanUsername;
    } else if (/^\d{5,15}$/.test(cleanUsername)) {
      resolvedChatId = cleanUsername;
      knownEntry = knownUsers[String(cleanUsername)];
      if (knownEntry) {
        firstName = knownEntry.firstName || firstName;
        lastName = knownEntry.lastName || "";
        matchedUsername = knownEntry.username || cleanUsername;
      }
    }

    // Fallback: try Telegram getChat API directly if username or chatId is not cached yet
    if (!resolvedChatId) {
      const chatQuery = /^\d+$/.test(cleanUsername)
        ? cleanUsername
        : `@${cleanUsername}`;
      for (const token of [otpBotToken, cfg.telegramBotToken].filter(Boolean)) {
        try {
          const chatRes = await fetch(
            `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatQuery)}`
          );
          const chatJson: any = await chatRes.json().catch(() => ({}));
          if (chatJson?.ok && chatJson.result?.id) {
            resolvedChatId = String(chatJson.result.id);
            firstName = chatJson.result.first_name || firstName;
            lastName = chatJson.result.last_name || "";
            matchedUsername =
              String(chatJson.result.username || cleanUsername).toLowerCase();
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!resolvedChatId) {
      return {
        ok: false as const,
        needsBotStart: true as const,
        botUsername,
        error: botUsername
          ? `প্রথমবার OTP পেতে নিচের বাটনে ক্লিক করে আমাদের বট (@${botUsername}) ওপেন করে "Start" চাপুন — সাথে সাথে অটোমেটিক আপনার টেলিগ্রামে OTP কোড চলে যাবে!`
          : `আপনার টেলিগ্রাম থেকে আগে আমাদের বটে গিয়ে "/start" মেসেজ দিন অথবা আপনার numeric Telegram ID দিন।`,
      };
    }

    // Fetch user's Telegram Profile Photo
    const freshAvatar = await fetchTelegramUserAvatarDataUrl(otpBotToken, resolvedChatId);
    const avatarUrl = freshAvatar || knownEntry?.avatarUrl;

    if (knownEntry && avatarUrl && knownEntry.avatarUrl !== avatarUrl) {
      knownEntry.avatarUrl = avatarUrl;
      knownUsers[String(resolvedChatId)] = knownEntry;
      if (matchedUsername) knownUsers[matchedUsername] = knownEntry;
      await persistKnownTgUsers(knownUsers);
    }

    // 3. Generate 6-digit OTP and send directly to the user's Telegram account via the OTP Bot
    const code = generateOtpCode();
    const secret = getOtpSecret();
    const challengeIdentity = `tg:${String(resolvedChatId)}:${matchedUsername}`;

    const { challengeToken, expiresAt } = createSignedOtpChallenge({
      email: challengeIdentity,
      code,
      purpose: data.purpose === "reset" ? "reset" : "signup",
      secret,
      ttlMs: 10 * 60 * 1000,
    });

    const isReset = data.purpose === "reset";
    const otpMsg = isReset
      ? `🔑 <b>${cfg.siteName} — Password Reset OTP</b>\n\n` +
        `👤 হ্যালো <b>${firstName}</b>,\n` +
        `আপনার পাসওয়ার্ড রিসেট করার ৬ সংখ্যার OTP কোড হলো:\n\n` +
        `👉 <code>${code}</code>\n\n` +
        `⏳ এই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে। ওয়েবসাইটে গিয়ে এই কোড ও নতুন পাসওয়ার্ড দিন।`
      : `🔐 <b>${cfg.siteName} — Telegram Login OTP</b>\n\n` +
        `👤 হ্যালো <b>${firstName}</b>,\n` +
        `আপনার অ্যাকাউন্ট ভেরিফিকেশন কোড হলো:\n\n` +
        `👉 <code>${code}</code>\n\n` +
        `⏳ এই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে। কোডটি কারো সাথে শেয়ার করবেন না।`;

    const sendRes = await fetch(
      `https://api.telegram.org/bot${otpBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: resolvedChatId,
          text: otpMsg,
          parse_mode: "HTML",
        }),
      }
    );

    const sendJson: any = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok || !sendJson?.ok) {
      return {
        ok: false as const,
        needsBotStart: true as const,
        botUsername,
        error: botUsername
          ? `টেলিগ্রামে মেসেজ পাঠানো যায়নি। অনুগ্রহ করে আগে @${botUsername} বটে গিয়ে "Start" চাপুন!`
          : "টেলিগ্রামে মেসেজ পাঠানো যায়নি। অনুগ্রহ করে আগে বটে /start মেসেজ দিন।",
      };
    }

    return {
      ok: true as const,
      challengeToken,
      challengeIdentity,
      expiresAt,
      botUsername,
      profile: {
        chatId: String(resolvedChatId),
        firstName,
        lastName,
        username: matchedUsername,
        avatarUrl,
        savedEmail: knownEntry?.email,
        savedPhone: knownEntry?.phone,
        supabaseUserId: knownEntry?.supabaseUserId,
      },
    };
  });

const verifyTgOtpSchema = z.object({
  challengeIdentity: z.string().min(3).max(200),
  code: z.string().min(1).max(20),
  challengeToken: z.string().min(10).max(300),
  purpose: z.enum(["login", "signup", "reset"]).default("login"),
});

export const verifyTelegramBotOtpServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyTgOtpSchema.parse(d))
  .handler(async ({ data }) => {
    cleanupCaches();
    const now = Date.now();
    const identity = data.challengeIdentity.trim().toLowerCase();
    const normalizedCode = normalizeOtpDigits(data.code, 6);

    const attemptKey = `tg_otp:${identity}:${data.challengeToken}`;
    const attempts = failedAttempts.get(attemptKey);
    if (attempts && attempts.count >= 6 && now < attempts.resetAt) {
      return {
        ok: false as const,
        error: "অতিরিক্ত ভুল চেষ্টার কারণে এই কোডটি ব্লক করা হয়েছে। নতুন কোড পাঠান।",
      };
    }

    if (usedChallenges.has(data.challengeToken)) {
      return {
        ok: false as const,
        error: "এই OTP কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে।",
      };
    }

    const res = verifySignedOtpChallenge({
      email: identity,
      code: normalizedCode,
      purpose: data.purpose === "reset" ? "reset" : "signup",
      challengeToken: data.challengeToken,
      secret: getOtpSecret(),
      now,
    });

    if (!res.valid) {
      const prev = failedAttempts.get(attemptKey);
      failedAttempts.set(attemptKey, {
        count: (prev?.count ?? 0) + 1,
        resetAt: now + 10 * 60 * 1000,
      });
      return {
        ok: false as const,
        error:
          res.reason === "expired"
            ? "⏰ OTP কোডের মেয়াদ শেষ হয়ে গেছে। আবার কোড পাঠান।"
            : "❌ OTP কোডটি সঠিক নয়। আপনার টেলিগ্রামে যাওয়া ৬ সংখ্যার কোডটি দিন।",
      };
    }

    usedChallenges.set(data.challengeToken, now + 15 * 60 * 1000);
    failedAttempts.delete(attemptKey);

    return {
      ok: true as const,
      verifiedAt: now,
    };
  });

// Store deep-link OTP challenges so polling only sends 1 message per sessionKey
const deepLinkSessions = new Map<
  string,
  {
    challengeToken: string;
    challengeIdentity: string;
    expiresAt: number;
    botUsername: string;
    profile: {
      chatId: string;
      firstName: string;
      lastName: string;
      username: string;
      avatarUrl?: string;
      savedEmail?: string;
      savedPhone?: string;
      supabaseUserId?: string;
    };
  }
>();

export const getTelegramBotInfoServer = createServerFn({ method: "GET" }).handler(
  async () => {
    const cfg = await loadOtpConfig();
    const token = getCustomerOtpBotToken(cfg);
    const botNumericId = token.includes(":") ? token.split(":")[0].trim() : "";
    let botUsername = "";
    let botName = "";
    if (token) {
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const meJson: any = await meRes.json().catch(() => ({}));
        if (meJson?.ok && meJson.result?.username) {
          botUsername = meJson.result.username;
          botName = meJson.result.first_name || "";
        }
      } catch {
        // ignore
      }
    }
    return {
      configured: Boolean(token),
      botNumericId,
      botUsername,
      botName,
    };
  }
);

export const verifyTelegramBotTokenInfoServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ botToken: z.string().min(10).max(250) }).parse(d)
  )
  .handler(async ({ data }) => {
    const clean = data.botToken.trim();
    const res = await fetch(`https://api.telegram.org/bot${clean}/getMe`);
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok || !json.result?.username) {
      throw new Error(json?.description || "Bot Token সঠিক নয়!");
    }
    return {
      ok: true as const,
      username: String(json.result.username),
      firstName: String(json.result.first_name || ""),
      id: String(json.result.id || ""),
    };
  });

const pollDeepLinkSchema = z.object({
  sessionKey: z.string().min(4).max(80),
  identifier: z.string().optional(),
  purpose: z.enum(["login", "signup", "reset"]).default("login"),
});

export const pollTelegramDeepLinkOtpServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pollDeepLinkSchema.parse(d))
  .handler(async ({ data }) => {
    cleanupCaches();
    const existing = deepLinkSessions.get(data.sessionKey);
    if (existing) {
      return {
        ok: true as const,
        ...existing,
      };
    }

    const cfg = await loadOtpConfig();
    const otpBotToken = getCustomerOtpBotToken(cfg);
    if (!otpBotToken) {
      return { ok: false as const, waiting: true as const };
    }

    const cleanUsername = (data.identifier || "").trim().replace(/^@/, "").toLowerCase();

    try {
      const { updates, knownUsers } = await syncTelegramUpdatesAndCacheUsers(
        otpBotToken,
        cfg.telegramBotToken
      );

      let matchedChatId: string | number | null = null;
      let firstName = "Telegram User";
      let lastName = "";
      let matchedUsername = cleanUsername || "telegram_user";

      const nowMs = Date.now();
      for (let i = updates.length - 1; i >= 0; i--) {
        const msg = updates[i]?.message;
        if (!msg?.chat?.id) continue;
        const text = String(msg.text || "").trim();
        const from = msg.from || msg.chat;
        const uname = String(from?.username || msg.chat?.username || "")
          .trim()
          .toLowerCase()
          .replace(/^@/, "");
        const msgDateMs = (Number(msg.date) || 0) * 1000;

        const isSessionStart = text.includes(data.sessionKey);
        const isUsernameMatch = cleanUsername && uname === cleanUsername;
        const isRecentBotStart =
          text.startsWith("/start") &&
          msgDateMs > 0 &&
          nowMs - msgDateMs < 90_000;

        if (isSessionStart || isUsernameMatch || isRecentBotStart) {
          matchedChatId = msg.chat.id;
          firstName = from?.first_name || msg.chat?.first_name || firstName;
          lastName = from?.last_name || msg.chat?.last_name || "";
          matchedUsername = uname || cleanUsername || `tg_${msg.chat.id}`;
          break;
        }
      }

      if (!matchedChatId) {
        return { ok: false as const, waiting: true as const };
      }

      const knownEntry =
        knownUsers[String(matchedChatId)] ||
        (matchedUsername ? knownUsers[matchedUsername] : undefined);

      // Fetch user's Telegram Profile Photo
      const freshAvatar = await fetchTelegramUserAvatarDataUrl(otpBotToken, matchedChatId);
      const avatarUrl = freshAvatar || knownEntry?.avatarUrl;

      if (knownEntry && avatarUrl && knownEntry.avatarUrl !== avatarUrl) {
        knownEntry.avatarUrl = avatarUrl;
        knownUsers[String(matchedChatId)] = knownEntry;
        if (matchedUsername) knownUsers[matchedUsername] = knownEntry;
        await persistKnownTgUsers(knownUsers);
      }

      const code = generateOtpCode();
      const secret = getOtpSecret();
      const challengeIdentity = `tg:${String(matchedChatId)}:${matchedUsername}`;
      const { challengeToken, expiresAt } = createSignedOtpChallenge({
        email: challengeIdentity,
        code,
        purpose: data.purpose === "reset" ? "reset" : "signup",
        secret,
        ttlMs: 10 * 60 * 1000,
      });

      const isReset = data.purpose === "reset";
      const otpMsg = isReset
        ? `🔑 <b>${cfg.siteName} — Password Reset OTP</b>\n\n` +
          `👤 হ্যালো <b>${firstName}</b>,\n` +
          `আপনার পাসওয়ার্ড রিসেট করার ৬ সংখ্যার OTP কোড হলো:\n\n` +
          `👉 <code>${code}</code>\n\n` +
          `⏳ এই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে। ওয়েবসাইটে ফিরে গিয়ে কোড ও নতুন পাসওয়ার্ড দিন।`
        : `🔐 <b>${cfg.siteName} — Telegram Login OTP</b>\n\n` +
          `👤 হ্যালো <b>${firstName}</b>,\n` +
          `আপনার অ্যাকাউন্ট ভেরিফিকেশন কোড হলো:\n\n` +
          `👉 <code>${code}</code>\n\n` +
          `⏳ এই কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে। ওয়েবসাইটে গিয়ে এই ৬ সংখ্যার কোডটি দিন।`;

      const sendRes = await fetch(
        `https://api.telegram.org/bot${otpBotToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: matchedChatId,
            text: otpMsg,
            parse_mode: "HTML",
          }),
        }
      );

      if (!sendRes.ok) {
        return { ok: false as const, waiting: true as const };
      }

      const payload = {
        challengeToken,
        challengeIdentity,
        expiresAt,
        botUsername: "",
        profile: {
          chatId: String(matchedChatId),
          firstName,
          lastName,
          username: matchedUsername,
          avatarUrl,
          savedEmail: knownEntry?.email,
          savedPhone: knownEntry?.phone,
          supabaseUserId: knownEntry?.supabaseUserId,
        },
      };

      deepLinkSessions.set(data.sessionKey, payload);
      return {
        ok: true as const,
        ...payload,
      };
    } catch {
      return { ok: false as const, waiting: true as const };
    }
  });

const saveTgProfileSchema = z.object({
  chatId: z.string().min(1).max(80),
  username: z.string().max(120).optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  email: z.string().email("সঠিক Gmail / Email ঠিকানা দিন").max(255),
  phone: z.string().min(6, "সঠিক মোবাইল নাম্বার দিন").max(30),
  avatarUrl: z.string().optional(),
});

/**
 * Persists a Telegram user's Gmail, Phone Number, Name, and Telegram Profile Photo
 * into `telegram_known_users` AND syncs with Supabase `users` table so their account
 * has their real Gmail, Phone Number, and Profile Picture permanently.
 */
export const saveTelegramUserProfileServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveTgProfileSchema.parse(d))
  .handler(async ({ data }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim();
    const chatId = String(data.chatId).trim();
    const uname = (data.username || "").trim().replace(/^@/, "").toLowerCase();
    const firstName = (data.firstName || "Telegram User").trim();
    const lastName = (data.lastName || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const knownUsers = await loadKnownTgUsers();
    const prev = knownUsers[chatId] || (uname ? knownUsers[uname] : undefined);
    const avatarUrl = data.avatarUrl || prev?.avatarUrl;

    let supabaseUserId = prev?.supabaseUserId;

    // Sync with Supabase public.users if an account with this email exists or can be created
    try {
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id, full_name, phone, avatar_url")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingUser?.id) {
        supabaseUserId = existingUser.id;
        await supabaseAdmin
          .from("users")
          .update({
            full_name: fullName || existingUser.full_name,
            phone: cleanPhone || existingUser.phone,
            avatar_url: avatarUrl || existingUser.avatar_url || null,
          })
          .eq("id", existingUser.id);
      } else {
        // Create a Supabase auth user so they also have a full database row in `public.users`
        const randomPassword = `Tg_${chatId}_${Math.random().toString(36).slice(2, 10)}!`;
        const { data: createdAuth } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone: cleanPhone,
            avatar_url: avatarUrl || null,
            telegram_chat_id: chatId,
            telegram_username: uname,
          },
        });
        if (createdAuth?.user?.id) {
          supabaseUserId = createdAuth.user.id;
          await supabaseAdmin
            .from("users")
            .upsert(
              {
                id: supabaseUserId,
                email: cleanEmail,
                full_name: fullName,
                phone: cleanPhone,
                avatar_url: avatarUrl || null,
              },
              { onConflict: "id" }
            );
        }
      }
    } catch {
      // ignore if Supabase service role is not configured
    }

    const updatedEntry: KnownTgUser = {
      chatId,
      firstName,
      lastName,
      username: uname || prev?.username || `tg_${chatId}`,
      email: cleanEmail,
      phone: cleanPhone,
      avatarUrl,
      supabaseUserId,
      updatedAt: Date.now(),
    };

    knownUsers[chatId] = updatedEntry;
    if (uname) {
      knownUsers[uname] = updatedEntry;
    }
    const cleanDigits = cleanPhone.replace(/[^0-9]/g, "");
    if (cleanDigits.length >= 8) {
      knownUsers[`phone_${cleanDigits.slice(-8)}`] = updatedEntry;
    }

    await persistKnownTgUsers(knownUsers);
    await recordRegisteredEmailServer(cleanEmail);

    return {
      ok: true as const,
      userId: supabaseUserId || `tg_${chatId}`,
      email: cleanEmail,
      phone: cleanPhone,
      displayName: fullName,
      avatarUrl,
    };
  });




