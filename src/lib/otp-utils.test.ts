import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOtpDigits,
  generateOtpCode,
  createSignedOtpChallenge,
  verifySignedOtpChallenge,
  buildOtpEmailHtml,
} from "./otp-utils";

test("normalizeOtpDigits converts Bangla numerals and strips non-digits", () => {
  assert.equal(normalizeOtpDigits("১২৩ ৪৫৬"), "123456");
  assert.equal(normalizeOtpDigits(" 98-76-54 "), "987654");
  assert.equal(normalizeOtpDigits("১২34৫6789"), "123456");
});

test("generateOtpCode produces a 6-digit numeric string", () => {
  for (let i = 0; i < 25; i++) {
    const code = generateOtpCode();
    assert.match(code, /^\d{6}$/);
  }
});

test("createSignedOtpChallenge and verifySignedOtpChallenge validate matching code and reject tampering", () => {
  const secret = "test-secret-key-for-otp";
  const now = 1_700_000_000_000;
  const { challengeToken } = createSignedOtpChallenge({
    email: "User@Example.com ",
    code: "482910",
    purpose: "signup",
    secret,
    ttlMs: 600_000,
    now,
  });

  // Valid with case-insensitive email and Bangla digits
  const ok = verifySignedOtpChallenge({
    email: "user@example.com",
    code: "৪৮২৯১০",
    purpose: "signup",
    challengeToken,
    secret,
    now: now + 30_000,
  });
  assert.equal(ok.valid, true);

  // Wrong code
  const wrongCode = verifySignedOtpChallenge({
    email: "user@example.com",
    code: "111111",
    purpose: "signup",
    challengeToken,
    secret,
    now: now + 30_000,
  });
  assert.equal(wrongCode.valid, false);
  assert.equal(wrongCode.reason, "mismatch");

  // Wrong email
  const wrongEmail = verifySignedOtpChallenge({
    email: "other@example.com",
    code: "482910",
    purpose: "signup",
    challengeToken,
    secret,
    now: now + 30_000,
  });
  assert.equal(wrongEmail.valid, false);
  assert.equal(wrongEmail.reason, "mismatch");

  // Expired token
  const expired = verifySignedOtpChallenge({
    email: "user@example.com",
    code: "482910",
    purpose: "signup",
    challengeToken,
    secret,
    now: now + 600_001,
  });
  assert.equal(expired.valid, false);
  assert.equal(expired.reason, "expired");
});

test("buildOtpEmailHtml embeds code and recipient details", () => {
  const mail = buildOtpEmailHtml({
    siteName: "DDS-Digital",
    recipientEmail: "customer@example.com",
    recipientName: "সাব্বির",
    code: "654321",
    purpose: "signup",
  });
  assert.ok(mail.subject.includes("654321"));
  assert.ok(mail.html.includes("654321"));
  assert.ok(mail.html.includes("সাব্বির"));
});
