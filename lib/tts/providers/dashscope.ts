import { randomUUID } from "crypto";
import { getOptionalServerEnv, getServerEnv } from "@/lib/env";
import type { SynthesizeSpeechInput, SynthesizeSpeechOutput } from "@/lib/tts";

type DashScopeHeader = {
  event?: string;
  error_code?: string;
  error_message?: string;
};

type DashScopeMessage = {
  header?: DashScopeHeader;
};

type WebSocketBinaryData = Buffer | ArrayBuffer | Buffer[];

const DEFAULT_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/inference";

function contentTypeFor(format: string) {
  if (format === "wav") {
    return "audio/wav";
  }
  if (format === "opus") {
    return "audio/ogg";
  }
  return "audio/mpeg";
}

export async function synthesizeWithDashScope(
  input: SynthesizeSpeechInput
): Promise<SynthesizeSpeechOutput> {
  process.env.WS_NO_BUFFER_UTIL = "1";
  process.env.WS_NO_UTF_8_VALIDATE = "1";

  const { default: WebSocket } = await import("ws");
  const apiKey = getServerEnv("DASHSCOPE_API_KEY");
  const url = getOptionalServerEnv("TTS_BASE_URL", DEFAULT_URL);
  const model = input.model || getOptionalServerEnv("TTS_MODEL", "cosyvoice-v3-flash");
  const voice = input.voice || getOptionalServerEnv("TTS_VOICE", "longanyang");
  const format = input.format || getOptionalServerEnv("TTS_FORMAT", "mp3");
  const text = input.text.trim();

  if (!text) {
    throw new Error("TTS text cannot be empty");
  }

  if (text.length > 1200) {
    throw new Error("TTS text is too long; keep it under 1200 characters");
  }

  const taskId = randomUUID();
  const audioChunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    const timeout = windowlessTimeout(() => {
      socket.close();
      reject(new Error("DashScope TTS timed out"));
    }, 90000);

    const socket = new WebSocket(url, {
      headers: {
        Authorization: `bearer ${apiKey}`,
        "X-DashScope-DataInspection": "enable"
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

    socket.on("open", () => {
      sendJson({
        header: {
          action: "run-task",
          task_id: taskId,
          streaming: "duplex"
        },
        payload: {
          task_group: "audio",
          task: "tts",
          function: "SpeechSynthesizer",
          model,
          parameters: {
            text_type: "PlainText",
            voice,
            format,
            sample_rate: 22050,
            volume: 50,
            rate: 1,
            pitch: 1,
            enable_ssml: false
          },
          input: {}
        }
      });
    });

    socket.on("message", (data: WebSocketBinaryData, isBinary: boolean) => {
      if (isBinary) {
        const chunk = Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.isBuffer(data)
            ? data
            : Buffer.from(data);
        audioChunks.push(chunk);
        return;
      }

      let message: DashScopeMessage | null = null;
      try {
        message = JSON.parse(data.toString()) as DashScopeMessage;
      } catch {
        return;
      }

      const header = message.header;
      if (!header?.event) {
        return;
      }

      if (header.event === "task-started") {
        sendJson({
          header: {
            action: "continue-task",
            task_id: taskId,
            streaming: "duplex"
          },
          payload: {
            input: {
              text
            }
          }
        });

        windowlessTimeout(() => {
          sendJson({
            header: {
              action: "finish-task",
              task_id: taskId,
              streaming: "duplex"
            },
            payload: {
              input: {}
            }
          });
        }, 500);
        return;
      }

      if (header.event === "task-failed") {
        finishWithError(
          header.error_message ||
            header.error_code ||
            "DashScope TTS task failed"
        );
        return;
      }

      if (header.event === "task-finished") {
        clearTimeout(timeout);
        socket.close();
        resolve({
          audio: Buffer.concat(audioChunks),
          contentType: contentTypeFor(format),
          provider: "dashscope"
        });
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
