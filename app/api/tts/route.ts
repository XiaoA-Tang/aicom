import { synthesizeSpeech } from "@/lib/tts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      voice?: string;
      format?: "mp3" | "wav" | "opus";
    };

    const text = body.text?.trim();
    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const result = await synthesizeSpeech({
      text,
      voice: body.voice,
      format: body.format
    });

    return new Response(new Uint8Array(result.audio), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": result.contentType,
        "X-TTS-Provider": result.provider
      }
    });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Unexpected TTS server error";
    const status = message.includes("Missing required environment variable")
      ? 500
      : 502;
    return Response.json({ error: message }, { status });
  }
}
