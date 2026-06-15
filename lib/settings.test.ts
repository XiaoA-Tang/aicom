import { describe, expect, it } from "vitest";

import { DEFAULT_SYSTEM_PROMPT, normalizeSystemPrompt } from "./settings";

describe("normalizeSystemPrompt", () => {
  it("trims usable prompt text", () => {
    expect(
      normalizeSystemPrompt("  你要像朋友一样自然聊天，回复短一点，适合直接朗读。  ")
    ).toBe("你要像朋友一样自然聊天，回复短一点，适合直接朗读。");
  });

  it("rejects empty prompt text", () => {
    expect(() => normalizeSystemPrompt("   ")).toThrow("至少");
  });

  it("rejects oversized prompt text", () => {
    expect(() => normalizeSystemPrompt("你".repeat(4001))).toThrow("不能超过");
  });

  it("keeps the default prompt focused on speakable daily conversation", () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain("只输出会被直接朗读给用户的正文");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("禁止");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("（挠了挠头）");
    expect(DEFAULT_SYSTEM_PROMPT).not.toContain("作为 AI 模型");
  });
});
