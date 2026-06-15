import { getOptionalServerEnv, getServerEnv } from "@/lib/env";
import { sanitizeDailyChatText } from "@/lib/ai/sanitize";

type ChatRole = "system" | "user" | "assistant";

export type DeepSeekMessage = {
  role: ChatRole;
  content: string;
};

type DeepSeekStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

export async function createDeepSeekTextStream(messages: DeepSeekMessage[]) {
  const apiKey = getServerEnv("DEEPSEEK_API_KEY");
  const baseUrl = getOptionalServerEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com");
  const model = getOptionalServerEnv("DEEPSEEK_MODEL", "deepseek-v4-flash");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek request failed with ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let pendingText = "";

  function enqueueCleanText(controller: ReadableStreamDefaultController<Uint8Array>, text: string) {
    const cleanText = sanitizeDailyChatText(text);
    if (cleanText) {
      controller.enqueue(encoder.encode(cleanText));
    }
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) {
              continue;
            }

            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(data) as DeepSeekStreamChunk;
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                pendingText += content;

                if (pendingText.length > 160) {
                  enqueueCleanText(controller, pendingText.slice(0, -80));
                  pendingText = pendingText.slice(-80);
                }
              }
            } catch {
              // Ignore malformed SSE frames and keep the stream alive.
            }
          }
        }
      } finally {
        if (pendingText) {
          enqueueCleanText(controller, pendingText);
        }
        controller.close();
        reader.releaseLock();
      }
    }
  });
}
