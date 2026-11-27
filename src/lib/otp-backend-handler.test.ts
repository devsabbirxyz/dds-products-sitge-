import test from "node:test";
import assert from "node:assert/strict";
import {
  hashOtpWithSalt,
  verifyOtpHashTimingSafe,
  processSendOrResendOtp,
  processVerifyOtp,
  resetOtpBackendStoresForTests,
} from "./otp-backend-handler";

test("SHA-256 + salt OTP hashing and timing-safe verification works accurately", () => {
  const salt = "random_salt_123";
  const hash = hashOtpWithSalt("1234", salt);
  assert.equal(verifyOtpHashTimingSafe("1234", salt, hash), true);
  assert.equal(verifyOtpHashTimingSafe("5454", salt, hash), false);
});

test("rate limit enforces max 3 sends per 10 minutes per identifier/IP", async () => {
  resetOtpBackendStoresForTests();
  const now = 1_700_000_000_000;

  const r1 = await processSendOrResendOtp({
    identifier: "user@example.com",
    ip: "10.0.0.1",
    fixedCodeForDemo: "1234",
    now,
  });
  assert.equal(r1.status, 200);

  const r2 = await processSendOrResendOtp({
    identifier: "user@example.com",
    ip: "10.0.0.1",
    fixedCodeForDemo: "1234",
    now: now + 31_000,
  });
  assert.equal(r2.status, 200);

  const r3 = await processSendOrResendOtp({
    identifier: "user@example.com",
    ip: "10.0.0.1",
    fixedCodeForDemo: "1234",
    now: now + 62_000,
  });
  assert.equal(r3.status, 200);

  // 4th send within 10 minutes is blocked with 429
  const r4 = await processSendOrResendOtp({
    identifier: "user@example.com",
    ip: "10.0.0.1",
    fixedCodeForDemo: "1234",
    now: now + 95_000,
  });
  assert.equal(r4.status, 429);
  assert.equal(r4.body.message, "Too many attempts, try again later.");
});

test("verify locks account for 15 minutes after 5 wrong attempts and sets httpOnly cookie on valid OTP", async () => {
  resetOtpBackendStoresForTests();
  const now = 1_700_000_000_000;

  await processSendOrResendOtp({
    identifier: "buyer@example.com",
    ip: "10.0.0.2",
    fixedCodeForDemo: "4829",
    now,
  });

  // 4 wrong attempts
  for (let i = 1; i <= 4; i++) {
    const wrong = processVerifyOtp({
      identifier: "buyer@example.com",
      code: "0000",
      now: now + i * 1000,
    });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.attemptsRemaining, 5 - i);
  }

  // 5th wrong attempt triggers 15-minute lockout (429)
  const fifth = processVerifyOtp({
    identifier: "buyer@example.com",
    code: "0000",
    now: now + 5000,
  });
  assert.equal(fifth.status, 429);

  // Even the right code is rejected while locked
  const lockedTry = processVerifyOtp({
    identifier: "buyer@example.com",
    code: "4829",
    now: now + 6000,
  });
  assert.equal(lockedTry.status, 429);

  // New user with valid OTP gets 200 + Set-Cookie with HttpOnly; Secure; SameSite=Lax
  await processSendOrResendOtp({
    identifier: "verified@example.com",
    ip: "10.0.0.3",
    fixedCodeForDemo: "1234",
    now,
  });
  const okRes = processVerifyOtp({
    identifier: "verified@example.com",
    code: "1234",
    now: now + 2000,
  });
  assert.equal(okRes.status, 200);
  assert.equal(okRes.body.verified, true);
  assert.ok(okRes.headers?.["Set-Cookie"]?.includes("HttpOnly; Secure; SameSite=Lax"));
});
