import { createDeepSeekTextStream, type DeepSeekMessage } from "@/lib/ai/deepseek";
import { getConversationSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: DeepSeekMessage[] };
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages is required" }, { status: 400 });
    }

    const cleanMessages = messages
      .filter((message) => message.content?.trim())
      .map((message) => ({
        role: message.role,
        content: message.content.trim()
      }));

    const settings = await getConversationSettings();
    const stream = await createDeepSeekTextStream([
      {
        role: "system",
        content: settings.systemPrompt
      },
      ...cleanMessages
    ]);

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Unexpected chat server error";
    const status = message.includes("Missing required environment variable")
      ? 500
      : 502;
    return Response.json({ error: message }, { status });
  }
}
