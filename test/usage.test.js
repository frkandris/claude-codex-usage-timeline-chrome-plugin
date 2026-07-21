import test from "node:test";
import assert from "node:assert/strict";
import { appendSample, extractChatGptAccountId, findOrganizationId, parseClaudeUsage, parseCodexUsage, projectUsage, removeMeasurement } from "../lib/usage.js";

test("parses Claude session and weekly utilization", () => {
  const result = parseClaudeUsage({
    five_hour: { utilization: 42, resets_at: "2026-07-15T16:00:00Z" },
    seven_day: { utilization: 0.73 },
    seven_day_fable: { utilization: 0, resets_at: "2026-07-24T06:00:00Z" }
  });
  assert.equal(result.session.used, 42); assert.equal(result.weekly.used, 73); assert.equal(result.fable.used, 0);
  assert.equal(result.fable.resetsAt, Date.parse("2026-07-24T06:00:00Z"));
});

test("reads an integer 1 as 1%, not a full fraction", () => {
  const result = parseClaudeUsage({ five_hour: { utilization: 1 }, seven_day: { utilization: 2 } });
  assert.equal(result.session.used, 1);
  assert.equal(result.weekly.used, 2);
});

test("still rescales a genuine sub-1 fraction", () => {
  const result = parseClaudeUsage({ five_hour: { utilization: 0.42 } });
  assert.equal(result.session.used, 42);
});

test("finds a nested Claude Fable limit", () => {
  const result = parseClaudeUsage({ five_hour: { utilization: 12 }, model_limits: [{ name: "Fable", utilization: 0.25 }] });
  assert.equal(result.fable.used, 25);
});

test("finds the Fable limit inside the scoped limits array", () => {
  const result = parseClaudeUsage({
    five_hour: { utilization: 18, resets_at: "2026-07-20T12:20:00Z" },
    seven_day: { utilization: 27, resets_at: "2026-07-24T04:00:00Z" },
    seven_day_fable: null,
    limits: [
      { kind: "session", group: "session", percent: 18, resets_at: "2026-07-20T12:20:00Z" },
      { kind: "weekly_all", group: "weekly", percent: 27, resets_at: "2026-07-24T04:00:00Z" },
      { kind: "weekly_scoped", group: "weekly", percent: 2, resets_at: "2026-07-24T04:00:00Z", scope: { model: { id: null, display_name: "Fable" } } }
    ]
  });
  assert.equal(result.session.used, 18);
  assert.equal(result.weekly.used, 27);
  assert.equal(result.fable.used, 2);
  assert.equal(result.fable.resetsAt, Date.parse("2026-07-24T04:00:00Z"));
});

test("parses Codex rate-limit windows", () => {
  const result = parseCodexUsage({ rate_limit: { primary_window: { used_percent: 18 }, secondary_window: { used_percent: 64 } } });
  assert.equal(result.session.used, 18); assert.equal(result.weekly.used, 64);
});

test("keeps a missing Codex weekly limit empty", () => {
  const result = parseCodexUsage({ rate_limit: { primary_window: { used_percent: 18 } } });
  assert.equal(result.session.used, 18); assert.equal(result.weekly.used, null);
});

test("parses Codex multi-limit payloads", () => {
  const result = parseCodexUsage({ rate_limits: [{ limit_id: "other" }, { limit_id: "codex", primary: { used_percent: 21 }, secondary: { used_percent: 47 } }] });
  assert.equal(result.session.used, 21); assert.equal(result.weekly.used, 47);
});

test("extracts the ChatGPT account ID from a session JWT", () => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = `${encode({ alg: "none" })}.${encode({ "https://api.openai.com/auth": { chatgpt_account_id: "account-123" } })}.signature`;
  assert.equal(extractChatGptAccountId({ accessToken }), "account-123");
});

test("finds an organization uuid in nested bootstrap data", () => {
  assert.equal(findOrganizationId({ account: { memberships: [{ organization: { uuid: "org-123" } }] } }), "org-123");
});

test("retains ordered recent samples", () => {
  const now = Date.now(); const result = appendSample([{ timestamp: now - 1000 }], { timestamp: now }, now);
  assert.deepEqual(result.map((item) => item.timestamp), [now - 1000, now]);
});

test("removes only the selected measurement", () => {
  const history = [{
    timestamp: 123,
    claude: { session: { used: 20 }, weekly: { used: 40 } },
    codex: { session: { used: 60 } }
  }];
  const result = removeMeasurement(history, 123, "claude", "session");
  assert.equal(result[0].claude.session, undefined);
  assert.equal(result[0].claude.weekly.used, 40);
  assert.equal(result[0].codex.session.used, 60);
});

test("removes an empty sample after its last measurement is deleted", () => {
  const history = [{ timestamp: 123, claude: { session: { used: 20 } }, codex: null }];
  assert.deepEqual(removeMeasurement(history, 123, "claude", "session"), []);
});

test("projects an increasing trend to 100% when it happens before reset", () => {
  const hour = 60 * 60 * 1000;
  const now = Date.now();
  const resetsAt = now + 4 * hour;
  const history = [
    { timestamp: now - 2 * hour, claude: { session: { used: 20, resetsAt } } },
    { timestamp: now - hour, claude: { session: { used: 40, resetsAt } } },
    { timestamp: now, claude: { session: { used: 60, resetsAt } } }
  ];
  const projection = projectUsage(history, "claude", "session", now);
  assert.equal(Math.round((projection.targetTimestamp - now) / hour), 2);
  assert.equal(projection.targetValue, 100);
  assert.equal(projection.targetReason, "limit");
});

test("stops a forecast at the next reset when exhaustion comes later", () => {
  const hour = 60 * 60 * 1000;
  const now = Date.now();
  const resetsAt = now + hour;
  const history = [20, 40, 60].map((used, index) => ({
    timestamp: now - (2 - index) * hour,
    claude: { session: { used, resetsAt } }
  }));
  const projection = projectUsage(history, "claude", "session", now);
  assert.equal(projection.targetTimestamp, resetsAt);
  assert.equal(Math.round(projection.targetValue), 80);
  assert.equal(projection.targetReason, "reset");
});

test("requires at least three samples for a forecast", () => {
  const now = Date.now();
  const history = [
    { timestamp: now - 1000, claude: { session: { used: 20 } } },
    { timestamp: now, claude: { session: { used: 40 } } }
  ];
  assert.equal(projectUsage(history, "claude", "session", now), null);
});

test("continues a flat series until its reset", () => {
  const hour = 60 * 60 * 1000;
  const now = Date.now();
  const resetsAt = now + 2 * hour;
  const history = [40, 40, 40].map((used, index) => ({
    timestamp: now - (2 - index) * hour,
    claude: { weekly: { used, resetsAt } }
  }));
  const projection = projectUsage(history, "claude", "weekly", now);
  assert.equal(projection.targetTimestamp, resetsAt);
  assert.equal(projection.targetValue, 40);
});
