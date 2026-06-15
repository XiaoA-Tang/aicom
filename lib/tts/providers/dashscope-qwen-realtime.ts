import { getOptionalServerEnv, getServerEnv } from "@/lib/env";
import { createPcm16MonoWav } from "@/lib/tts/audio";
import type { SynthesizeSpeechInput, SynthesizeSpeechOutput } from "@/lib/tts";

type QwenRealtimeEvent = {
  type?: string;
  delta?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

type WebSocketBinaryData = Buffer | ArrayBuffer | Buffer[];

const DEFAULT_REALTIME_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";
const DEFAULT_MODEL = "qwen3-tts-flash-realtime";
const DEFAULT_SAMPLE_RATE = 24000;

type QwenRealtimeSessionUpdateInput = {
  model: string;
  voice: string;
  languageType: string;
  sampleRate: number;
  instructions?: string;
};

export function buildQwenRealtimeUrl(baseUrl: string, model: string) {
  const url = new URL(baseUrl);

  if (!url.searchParams.has("model")) {
    url.searchParams.set("model", model);
  }

  return url.toString();
}

export function buildQwenRealtimeSessionUpdate(
  input: QwenRealtimeSessionUpdateInput
) {
  const session: {
    mode: "server_commit";
    voice: string;
    language_type: string;
    response_format: "pcm";
    sample_rate: number;
    instructions?: string;
  } = {
    mode: "server_commit",
    voice: input.voice,
    language_type: input.languageType,
    response_format: "pcm",
    sample_rate: input.sampleRate
  };
  const instructions = input.instructions?.trim();

  if (input.model === "qwen3-tts-instruct-flash-realtime" && instructions) {
    session.instructions = instructions;
  }

  return {
    type: "session.update",
    session
  };
}

export async function synthesizeWithDashScopeQwenRealtime(
  input: SynthesizeSpeechInput
): Promise<SynthesizeSpeechOutput> {
  process.env.WS_NO_BUFFER_UTIL = "1";
  process.env.WS_NO_UTF_8_VALIDATE = "1";

  const { default: WebSocket } = await import("ws");
  const apiKey = getServerEnv("DASHSCOPE_API_KEY");
  const model = input.model || getOptionalServerEnv("TTS_MODEL", DEFAULT_MODEL);
  const baseUrl = getOptionalServerEnv("TTS_BASE_URL", DEFAULT_REALTIME_URL);
  const url = buildQwenRealtimeUrl(baseUrl, model);
  const voice = input.voice || getOptionalServerEnv("TTS_VOICE", "Cherry");
  const languageType =
    input.languageType || getOptionalServerEnv("TTS_LANGUAGE", "Chinese");
  const instructions =
    input.instructions || getOptionalServerEnv("TTS_INSTRUCTIONS", "");
  const text = input.text.trim();

  if (!text) {
    throw new Error("TTS text cannot be empty");
  }

  if (text.length > 1200) {
    throw new Error("TTS text is too long; keep it under 1200 characters");
  }

  const pcmChunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    const timeout = windowlessTimeout(() => {
      socket.close();
      reject(new Error("DashScope Qwen-TTS Realtime timed out"));
    }, 90000);

    const socket = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    function sendJson(payload: unknown) {
      socket.send(JSON.stringify(payload));
    }

    function finishWithError(message: string) {
      clearTimeout(timeout);
      socket.close();
      reject(new Error(message));
    }

    function appendAndFinishText() {
      sendJson({
        type: "input_text_buffer.append",
        text
      });

      windowlessTimeout(() => {
        sendJson({
          type: "session.finish"
        });
      }, 1000);
    }

    socket.on("open", () => {
      sendJson(
        buildQwenRealtimeSessionUpdate({
          instructions,
          languageType,
          model,
          sampleRate: DEFAULT_SAMPLE_RATE,
          voice
        })
      );
    });

    socket.on("message", (data: WebSocketBinaryData, isBinary: boolean) => {
      if (isBinary) {
        const chunk = Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.isBuffer(data)
            ? data
            : Buffer.from(data);
        pcmChunks.push(chunk);
        return;
      }

      let event: QwenRealtimeEvent | null = null;

      try {
        event = JSON.parse(data.toString()) as QwenRealtimeEvent;
      } catch {
        return;
      }

      if (!event?.type) {
        return;
      }

      if (event.type === "session.updated") {
        appendAndFinishText();
        return;
      }

      if (event.type === "response.audio.delta" && event.delta) {
        pcmChunks.push(Buffer.from(event.delta, "base64"));
        return;
      }

      if (event.type === "response.done") {
        clearTimeout(timeout);
        socket.close();
        resolve({
          audio: createPcm16MonoWav(Buffer.concat(pcmChunks), DEFAULT_SAMPLE_RATE),
          contentType: "audio/wav",
          provider: "dashscope-qwen-realtime"
        });
        return;
      }

      if (event.type.endsWith(".failed") || event.type === "error") {
        finishWithError(
          event.error?.message ||
            event.error?.code ||
            "DashScope Qwen-TTS Realtime task failed"
        );
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
