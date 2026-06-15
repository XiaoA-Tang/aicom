import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ConversationSettings = {
  systemPrompt: string;
  updatedAt: string;
};

export type ConversationSettingsResponse = ConversationSettings & {
  defaultSystemPrompt: string;
};

export const DEFAULT_SYSTEM_PROMPT = [
  "你是 aicom，一个适合语音对话的中文日常聊天伙伴。",
  "说话要像真实朋友聊天：自然、简短、温和，可以接住用户情绪，但不要说教。",
  "每次回复优先 1 到 3 句，除非用户明确要求详细说明。",
  "只输出会被直接朗读给用户的正文。",
  "禁止写任何动作、神态、心理活动或舞台提示，包括括号、方括号、星号里的内容，例如“（挠了挠头）”“（笑）”“*叹气*”。",
  "不要用 AI 身份开场，也不要解释自己的限制，直接自然回应。",
  "可以在合适时问一个轻松的追问，让对话继续。"
].join("\n");

const SETTINGS_DIR = path.join(process.cwd(), ".data");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "conversation-settings.json");
const MIN_PROMPT_LENGTH = 20;
const MAX_PROMPT_LENGTH = 4000;

export function normalizeSystemPrompt(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("对话提示词必须是文本");
  }

  const prompt = value.trim();

  if (prompt.length < MIN_PROMPT_LENGTH) {
    throw new Error(`对话提示词至少需要 ${MIN_PROMPT_LENGTH} 个字符`);
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`对话提示词不能超过 ${MAX_PROMPT_LENGTH} 个字符`);
  }

  return prompt;
}

export function createDefaultConversationSettings(): ConversationSettings {
  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    updatedAt: new Date(0).toISOString()
  };
}

export function toSettingsResponse(
  settings: ConversationSettings
): ConversationSettingsResponse {
  return {
    ...settings,
    defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT
  };
}

export async function getConversationSettings(): Promise<ConversationSettings> {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ConversationSettings>;
    return {
      systemPrompt: normalizeSystemPrompt(parsed.systemPrompt),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date(0).toISOString()
    };
  } catch (caught) {
    if ((caught as NodeJS.ErrnoException).code === "ENOENT") {
      return createDefaultConversationSettings();
    }

    if (
      caught instanceof SyntaxError ||
      (caught instanceof Error && caught.message.startsWith("对话提示词"))
    ) {
      return createDefaultConversationSettings();
    }

    throw caught;
  }
}

export async function saveConversationSettings(
  value: unknown
): Promise<ConversationSettings> {
  const settings = {
    systemPrompt: normalizeSystemPrompt(value),
    updatedAt: new Date().toISOString()
  };

  await mkdir(SETTINGS_DIR, { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");

  return settings;
}
