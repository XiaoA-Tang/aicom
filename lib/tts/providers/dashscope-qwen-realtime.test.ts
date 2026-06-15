import { describe, expect, it } from "vitest";

import { buildQwenRealtimeUrl } from "./dashscope-qwen-realtime";

describe("buildQwenRealtimeUrl", () => {
  it("adds the model query parameter when it is missing", () => {
    expect(
      buildQwenRealtimeUrl(
        "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
        "qwen3-tts-flash-realtime"
      )
    ).toBe(
      "wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime"
    );
  });

  it("keeps an explicit model in a workspace URL", () => {
    expect(
      buildQwenRealtimeUrl(
        "wss://demo.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime",
        "qwen3-tts-instruct-flash-realtime"
      )
    ).toBe(
      "wss://demo.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime"
    );
  });
});
