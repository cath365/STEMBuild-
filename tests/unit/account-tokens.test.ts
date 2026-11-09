import test from "node:test";
import assert from "node:assert/strict";
import { hashToken, joinCodeCandidates, newJoinCode, newToken, normalizeJoinCode, tokenStatus, validateDisplayName, validateEmail, validateNewPassword } from "../../src/lib/account-tokens";

test("tokens are random, URL-safe and stored only as a hash", () => {
  const a = newToken(), b = newToken();
  assert.notEqual(a.token, b.token);
  assert.match(a.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(a.hash, hashToken(a.token));
  assert.notEqual(a.hash, a.token);
  assert.match(a.hash, /^[0-9a-f]{64}$/);
});

test("class codes are generated and normalised however learners type them", () => {
  assert.match(newJoinCode(), /^STEM-[0-9A-F]{6}$/);
  for (const typed of ["STEM-1A2B3C", "stem-1a2b3c", "1a2b3c", " STEM 1A2B3C ", "stem_1a2b3c"]) assert.equal(normalizeJoinCode(typed), "STEM-1A2B3C");
  for (const bad of ["", "STEM-1A2B", "STEM-1A2B3CD", "STEM-ZZZZZZ", "hello"]) assert.equal(normalizeJoinCode(bad), null);
});

test("class-code lookup accepts any existing code exactly and loose typing of new codes", () => {
  assert.deepEqual(joinCodeCandidates(" demo-stem-01 "), ["DEMO-STEM-01"]);
  assert.deepEqual(joinCodeCandidates("1a2b3c"), ["1A2B3C", "STEM-1A2B3C"]);
  assert.deepEqual(joinCodeCandidates("stem 1a2b3c"), ["STEM1A2B3C", "STEM-1A2B3C"]);
  assert.deepEqual(joinCodeCandidates("STEM-1A2B3C"), ["STEM-1A2B3C"]);
  for (const junk of ["", "   ", "x".repeat(41), "drop table;", "<script>"]) assert.deepEqual(joinCodeCandidates(junk), []);
});

test("sign-up validation", () => {
  assert.deepEqual(validateDisplayName("  Chanda   Mwale "), { value: "Chanda Mwale" });
  assert.ok("error" in validateDisplayName("A"));
  assert.deepEqual(validateEmail(" Pupil@School.org "), { value: "pupil@school.org" });
  assert.ok("error" in validateEmail("not-an-email"));
  assert.equal(validateNewPassword("short", "short"), "Password must be at least 12 characters. A short sentence works well.");
  assert.equal(validateNewPassword("a long enough phrase", "a long enough phrasE"), "The two passwords do not match.");
  assert.equal(validateNewPassword("aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa"), "Choose a less predictable password.");
  assert.equal(validateNewPassword("chanda-likes-robots", "chanda-likes-robots", "chanda@school.org"), "Your password must not contain your email name.");
  assert.equal(validateNewPassword("green circuits glow at night", "green circuits glow at night", "pupil@school.org"), null);
});

test("token status covers valid, used and expired links", () => {
  const now = new Date("2026-11-09T10:00:00Z");
  assert.equal(tokenStatus(null, now), "invalid");
  assert.equal(tokenStatus({ usedAt: null, expiresAt: new Date("2026-11-10T10:00:00Z") }, now), "valid");
  assert.equal(tokenStatus({ usedAt: new Date("2026-11-09T09:00:00Z"), expiresAt: new Date("2026-11-10T10:00:00Z") }, now), "used");
  assert.equal(tokenStatus({ usedAt: null, expiresAt: new Date("2026-11-09T09:59:59Z") }, now), "expired");
});
