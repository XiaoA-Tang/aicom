import { describe, expect, it } from "vitest";

import {
  buildQwenRealtimeSessionUpdate,
  buildQwenRealtimeUrl
} from "./dashscope-qwen-realtime";

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

describe("buildQwenRealtimeSessionUpdate", () => {
  it("uses editable voice and language settings", () => {
    expect(
      buildQwenRealtimeSessionUpdate({
        instructions: "",
        languageType: "Chinese",
        model: "qwen3-tts-flash-realtime",
        sampleRate: 24000,
        voice: "Maia"
      })
    ).toEqual({
      session: {
        language_type: "Chinese",
        mode: "server_commit",
        response_format: "pcm",
        sample_rate: 24000,
        voice: "Maia"
      },
      type: "session.update"
    });
  });

  it("adds instructions for the instruct realtime model", () => {
    expect(
      buildQwenRealtimeSessionUpdate({
        instructions: "Natural daily chat.",
        languageType: "Chinese",
        model: "qwen3-tts-instruct-flash-realtime",
        sampleRate: 24000,
        voice: "Maia"
      })
    ).toMatchObject({
      session: {
        instructions: "Natural daily chat.",
        voice: "Maia"
      }
    });
  });
});
