import { synthesizeWithDashScope } from "@/lib/tts/providers/dashscope";
import { synthesizeWithDashScopeQwenRealtime } from "@/lib/tts/providers/dashscope-qwen-realtime";

export type SynthesizeSpeechInput = {
  text: string;
  voice?: string;
  format?: "mp3" | "wav" | "opus";
};

export type SynthesizeSpeechOutput = {
  audio: Buffer;
  contentType: string;
  provider: string;
};

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput
): Promise<SynthesizeSpeechOutput> {
  const provider = process.env.TTS_PROVIDER || "dashscope-qwen-realtime";

  if (provider === "dashscope-qwen-realtime") {
    return synthesizeWithDashScopeQwenRealtime(input);
  }

  if (provider === "dashscope") {
    return synthesizeWithDashScope(input);
  }

  throw new Error(`Unsupported TTS provider: ${provider}`);
}
