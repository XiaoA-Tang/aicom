import {
  getConversationSettings,
  saveConversationSettings,
  toSettingsResponse
} from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getConversationSettings();
  return Response.json(toSettingsResponse(settings));
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { systemPrompt?: unknown };
    const settings = await saveConversationSettings(body.systemPrompt);

    return Response.json(toSettingsResponse(settings));
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "后台设置保存失败，请稍后重试";
    return Response.json({ error: message }, { status: 400 });
  }
}
