import crypto from "node:crypto";

export type OtpPurpose = "signup" | "login" | "reset" | "test";

export function hashPasswordSha256(password: string, email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  return crypto
    .createHash("sha256")
    .update(`dds-auth-v1|${cleanEmail}|${password}`)
    .digest("hex");
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureValidUuid(candidateId: string | undefined, seed: string): string {
  if (candidateId && UUID_REGEX.test(candidateId.trim())) {
    return candidateId.trim().toLowerCase();
  }
  const hex = crypto
    .createHash("sha256")
    .update(`dds-uuid-v1|${(seed || "default").trim().toLowerCase()}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const BANGLA_DIGIT_MAP: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/**
 * Normalizes user-entered OTP strings, converting Bengali digits (০-৯) to ASCII (0-9)
 * and stripping any spaces or non-numeric characters.
 */
export function normalizeOtpDigits(raw: string, maxLength = 6): string {
  const converted = String(raw || "")
    .split("")
    .map((ch) => BANGLA_DIGIT_MAP[ch] ?? ch)
    .join("");
  return converted.replace(/[^0-9]/g, "").slice(0, maxLength);
}

/**
 * Generates a cryptographically random 6-digit (default) or 4-digit OTP code.
 */
export function generateOtpCode(length: 4 | 6 = 6): string {
  if (length === 4) {
    const n = crypto.randomInt(1000, 10000);
    return String(n);
  }
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

function computeHmac(
  email: string,
  code: string,
  purpose: OtpPurpose,
  expiresAt: number,
  secret: string,
): string {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = normalizeOtpDigits(code, 6);
  const payload = `${normalizedEmail}|${normalizedCode}|${purpose}|${expiresAt}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export interface CreateOtpChallengeParams {
  email: string;
  code: string;
  purpose: OtpPurpose;
  secret: string;
  ttlMs?: number;
  now?: number;
}

/**
 * Creates a stateless HMAC-signed challenge token (`expiresAt.signature`) so OTP
 * verification works reliably without requiring extra database tables.
 */
export function createSignedOtpChallenge({
  email,
  code,
  purpose,
  secret,
  ttlMs = 10 * 60 * 1000, // 10 minutes
  now = Date.now(),
}: CreateOtpChallengeParams): { challengeToken: string; expiresAt: number } {
  const expiresAt = now + ttlMs;
  const sig = computeHmac(email, code, purpose, expiresAt, secret);
  return {
    challengeToken: `${expiresAt}.${sig}`,
    expiresAt,
  };
}

export interface VerifyOtpChallengeParams {
  email: string;
  code: string;
  purpose: OtpPurpose;
  challengeToken: string;
  secret: string;
  now?: number;
}

export interface VerifyOtpChallengeResult {
  valid: boolean;
  reason?: "invalid_token" | "expired" | "mismatch";
}

export function verifySignedOtpChallenge({
  email,
  code,
  purpose,
  challengeToken,
  secret,
  now = Date.now(),
}: VerifyOtpChallengeParams): VerifyOtpChallengeResult {
  if (!challengeToken || typeof challengeToken !== "string") {
    return { valid: false, reason: "invalid_token" };
  }
  const parts = challengeToken.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "invalid_token" };
  }
  const expiresAt = Number(parts[0]);
  const providedSig = parts[1];
  if (!Number.isFinite(expiresAt) || !providedSig || providedSig.length !== 64) {
    return { valid: false, reason: "invalid_token" };
  }
  if (now > expiresAt) {
    return { valid: false, reason: "expired" };
  }
  const normalizedCode = normalizeOtpDigits(code, 6);
  if (normalizedCode.length !== 4 && normalizedCode.length !== 6) {
    return { valid: false, reason: "mismatch" };
  }
  const expectedSig = computeHmac(email, normalizedCode, purpose, expiresAt, secret);
  try {
    const a = Buffer.from(providedSig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: "mismatch" };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "invalid_token" };
  }
}

export function buildOtpEmailHtml(params: {
  siteName: string;
  recipientEmail: string;
  recipientName?: string;
  code: string;
  purpose: OtpPurpose;
}): { subject: string; html: string; text: string } {
  const siteName = params.siteName || "DDS-Digital";
  const greetingName = params.recipientName?.trim() || "প্রিয় গ্রাহক";
  const isReset = params.purpose === "reset";
  const titleBn = isReset ? "পাসওয়ার্ড রিসেট ভেরিফিকেশন কোড" : "অ্যাকাউন্ট ভেরিফিকেশন কোড (OTP)";
  const subBn = isReset
    ? "আপনার পাসওয়ার্ড পরিবর্তন নিশ্চিত করতে নিচের ৬-সংখ্যার OTP কোডটি ব্যবহার করুন।"
    : `${siteName}-এ আপনার নতুন অ্যাকাউন্ট ভেরিফাই করতে নিচের ৬-সংখ্যার OTP কোডটি ওয়েবসাইটে বসান।`;

  const subject = `${params.code} হলো আপনার ${siteName} ভেরিফিকেশন কোড (OTP)`;

  const text = `${greetingName},\n\n${subBn}\n\nআপনার OTP কোড: ${params.code}\n\nএই কোডটি ১০ মিনিটের জন্য কার্যকর থাকবে। নিরাপত্তার স্বার্থে কোডটি কারো সাথে শেয়ার করবেন না।\n\nধন্যবাদ,\n${siteName}`;

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#090914;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#090914;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#121326;border:1px solid #2a2c4e;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9 0%,#9333ea 50%,#c026d3 100%);padding:26px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${siteName}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.88);margin-top:4px;">${titleBn}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px;">
              <p style="margin:0 0 12px;font-size:15px;color:#e2e8f0;font-weight:600;">হ্যালো ${greetingName},</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94a3b8;">
                ${subBn}
              </p>
              <div style="background-color:#1a1c38;border:2px dashed #8b5cf6;border-radius:16px;padding:22px 16px;text-align:center;margin:0 0 24px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a78bfa;margin-bottom:8px;font-weight:700;">Verification Code (OTP)</div>
                <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#ffffff;font-family:'Courier New',monospace;">${params.code}</div>
              </div>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">
                ⏱️ এই কোডটি আগামী <strong style="color:#e2e8f0;">১০ মিনিট</strong> কার্যকর থাকবে।<br/>
                🔒 নিরাপত্তার স্বার্থে এই OTP কোডটি কারো সাথে শেয়ার করবেন না।
              </p>
              <hr style="border:none;border-top:1px solid #232645;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">
                আপনি যদি (${params.recipientEmail}) থেকে এই রিকোয়েস্ট না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করতে পারেন।
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
