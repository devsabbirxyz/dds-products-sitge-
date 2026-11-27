import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialOtpState,
  otpMachineReducer,
  maskIdentifier,
  formatCountdown,
  isCodeComplete,
  getFilledCount,
} from "./otp-state-machine";
import {
  generateOtpCode,
  createSignedOtpChallenge,
  verifySignedOtpChallenge,
  hashPasswordSha256,
} from "./otp-utils";

test("initial state defaults to 6 empty boxes at idle and 30s resend timer", () => {
  const state = createInitialOtpState();
  assert.equal(state.status, "idle");
  assert.equal(state.length, 6);
  assert.deepEqual(state.digits, ["", "", "", "", "", ""]);
  assert.equal(state.activeIndex, 0);
  assert.equal(state.resendSeconds, 30);
  assert.equal(getFilledCount(state.digits), 0);
});

test("typing 6 digits advances activeIndex and transitions idle -> typing -> verifying -> success", () => {
  let state = createInitialOtpState(6);
  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 0, digit: "1" });
  assert.equal(state.status, "typing");
  assert.equal(state.activeIndex, 1);
  assert.equal(getFilledCount(state.digits), 1);

  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 1, digit: "2" });
  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 2, digit: "3" });
  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 3, digit: "4" });
  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 4, digit: "5" });
  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 5, digit: "6" });

  assert.deepEqual(state.digits, ["1", "2", "3", "4", "5", "6"]);
  assert.equal(isCodeComplete(state.digits, 6), true);

  state = otpMachineReducer(state, { type: "START_VERIFY" });
  assert.equal(state.status, "verifying");

  state = otpMachineReducer(state, { type: "VERIFY_SUCCESS" });
  assert.equal(state.status, "success");
});

test("wrong code transitions verifying -> error with glitch -> reset cascade -> idle", () => {
  let state = createInitialOtpState(6);
  state = otpMachineReducer(state, {
    type: "PASTE",
    digits: ["5", "4", "5", "4", "5", "4"],
  });
  assert.deepEqual(state.digits, ["5", "4", "5", "4", "5", "4"]);
  assert.deepEqual(state.entrySeq, [1, 1, 1, 1, 1, 1]);

  state = otpMachineReducer(state, { type: "START_VERIFY" });
  assert.equal(state.status, "verifying");

  state = otpMachineReducer(state, { type: "VERIFY_ERROR" });
  assert.equal(state.status, "error");
  assert.equal(state.isGlitching, true);
  assert.equal(state.errorMessage, "That code didn't match. Try again.");

  state = otpMachineReducer(state, { type: "STOP_GLITCH" });
  assert.equal(state.isGlitching, false);

  state = otpMachineReducer(state, { type: "START_RESET" });
  assert.equal(state.status, "reset");
  assert.equal(state.isClearingError, true);
  assert.equal(state.activeIndex, 0);

  state = otpMachineReducer(state, { type: "RESET_TO_IDLE" });
  assert.equal(state.status, "idle");
  assert.deepEqual(state.digits, ["", "", "", "", "", ""]);
  assert.equal(state.activeIndex, 0);
  assert.equal(state.errorMessage, null);

  state = otpMachineReducer(state, { type: "SET_RESEND_SECONDS", seconds: 28 });
  assert.equal(state.resendSeconds, 28);
});

test("backspace clears current digit or moves back to previous box", () => {
  let state = createInitialOtpState(6);
  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 0, digit: "1" });
  state = otpMachineReducer(state, { type: "SET_DIGIT", index: 1, digit: "2" });
  // Now activeIndex is 2, box 2 is empty
  state = otpMachineReducer(state, { type: "BACKSPACE", index: 2 });
  assert.deepEqual(state.digits, ["1", "", "", "", "", ""]);
  assert.equal(state.activeIndex, 1);

  state = otpMachineReducer(state, { type: "BACKSPACE", index: 1 });
  assert.deepEqual(state.digits, ["", "", "", "", "", ""]);
  assert.equal(state.activeIndex, 0);
  assert.equal(state.status, "idle");

  // Also verify BACKSPACE works when in error state (user entered wrong OTP and wants to delete manually)
  state = otpMachineReducer(state, {
    type: "PASTE",
    digits: ["5", "4", "5", "4", "5", "4"],
  });
  state = otpMachineReducer(state, { type: "VERIFY_ERROR" });
  assert.equal(state.status, "error");
  state = otpMachineReducer(state, { type: "BACKSPACE", index: 5 });
  assert.deepEqual(state.digits, ["5", "4", "5", "4", "5", ""]);
  assert.equal(state.status, "typing");
  assert.equal(state.errorMessage, null);
  assert.equal(state.activeIndex, 5);
});

test("resend timer counts down and respects max 3 resends per session", () => {
  let state = createInitialOtpState(6, 2, 3);
  state = otpMachineReducer(state, { type: "TICK_RESEND" });
  assert.equal(state.resendSeconds, 1);
  state = otpMachineReducer(state, { type: "TICK_RESEND" });
  assert.equal(state.resendSeconds, 0);

  state = otpMachineReducer(state, { type: "RESEND_SUCCESS", cooldownSeconds: 30 });
  assert.equal(state.resendCount, 1);
  assert.equal(state.resendSeconds, 30);
  assert.equal(state.toastMessage, "Code sent");

  state = otpMachineReducer(state, { type: "RESEND_SUCCESS", cooldownSeconds: 30 });
  state = otpMachineReducer(state, { type: "RESEND_SUCCESS", cooldownSeconds: 30 });
  assert.equal(state.resendCount, 3);

  // 4th resend is blocked
  const blocked = otpMachineReducer(state, { type: "RESEND_SUCCESS", cooldownSeconds: 30 });
  assert.equal(blocked.resendCount, 3);
});

test("maskIdentifier and formatCountdown format strings accurately", () => {
  assert.equal(maskIdentifier("sabbir@gmail.com"), "s•••••@gmail.com");
  assert.equal(maskIdentifier("s•••••@gmail.com"), "s•••••@gmail.com");
  assert.equal(formatCountdown(30), "0:30");
  assert.equal(formatCountdown(17), "0:17");
  assert.equal(formatCountdown(5), "0:05");
  assert.equal(formatCountdown(0), "0:00");
});

test("signed OTP challenge strictly rejects random 6-digit codes and only accepts matching code", () => {
  const email = "customer@gmail.com";
  const secret = "test-hmac-secret-2026";
  const realCode = generateOtpCode(6);
  const { challengeToken } = createSignedOtpChallenge({
    email,
    code: realCode,
    purpose: "signup",
    secret,
  });

  // Random 6-digit codes must ALWAYS fail
  const randomCode = realCode === "999999" ? "888888" : "999999";
  const wrongResult = verifySignedOtpChallenge({
    email,
    code: randomCode,
    purpose: "signup",
    challengeToken,
    secret,
  });
  assert.equal(wrongResult.valid, false);
  assert.equal(wrongResult.reason, "mismatch");

  // Wrong purpose must fail
  const wrongPurposeResult = verifySignedOtpChallenge({
    email,
    code: realCode,
    purpose: "login",
    challengeToken,
    secret,
  });
  assert.equal(wrongPurposeResult.valid, false);

  // Exact matching code, email, and purpose succeeds
  const validResult = verifySignedOtpChallenge({
    email,
    code: realCode,
    purpose: "signup",
    challengeToken,
    secret,
  });
  assert.equal(validResult.valid, true);
});

test("hashPasswordSha256 produces deterministic salted hashes", () => {
  const h1 = hashPasswordSha256("MySecurePass123!", "user@gmail.com");
  const h2 = hashPasswordSha256("MySecurePass123!", "USER@gmail.com");
  const hWrong = hashPasswordSha256("WrongPass123!", "user@gmail.com");
  assert.equal(h1, h2);
  assert.notEqual(h1, hWrong);
});

