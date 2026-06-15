import { describe, expect, it } from "vitest";

import { sanitizeDailyChatText } from "./sanitize";

describe("sanitizeDailyChatText", () => {
  it("removes parenthetical action directions", () => {
    expect(sanitizeDailyChatText("（挠了挠头）今天确实有点累。")).toBe(
      "今天确实有点累。"
    );
  });

  it("removes inline action directions without damaging normal text", () => {
    expect(sanitizeDailyChatText("可以呀（笑），我们慢慢来。")).toBe(
      "可以呀，我们慢慢来。"
    );
    expect(sanitizeDailyChatText("今天（周一）可以轻松一点。")).toBe(
      "今天（周一）可以轻松一点。"
    );
  });

  it("removes star-wrapped stage directions", () => {
    expect(sanitizeDailyChatText("*叹气*那今天就别太撑着。")).toBe(
      "那今天就别太撑着。"
    );
  });
});
