"use client";

import {
  Bot,
  Check,
  Copy,
  Loader2,
  Mic,
  MicOff,
  Pause,
  RotateCcw,
  Save,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
  User,
  Volume2,
  X
} from "lucide-react";
import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState
} from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  audioUrl?: string;
  isSpeaking?: boolean;
};

type VoiceState = "idle" | "listening" | "processing" | "unsupported";

type ConversationSettingsResponse = {
  systemPrompt: string;
  defaultSystemPrompt: string;
  updatedAt: string;
  error?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "嗨，我在。按住下方圆形按钮说话，松开后我会用更像日常聊天的方式回复你。"
  }
];

const samplePrompts = [
  "今天有点累，陪我随便聊两句。",
  "帮我想一个轻松的晚饭选择。",
  "用朋友聊天的语气鼓励我一下。"
];

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

function formatSettingsUpdatedAt(value: string | null) {
  if (!value || value === new Date(0).toISOString()) {
    return "使用默认设置";
  }

  return `更新于 ${new Date(value).toLocaleString("zh-CN", {
    hour12: false
  })}`;
}

export function ChatWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState("");
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const shouldSendVoiceRef = useRef(false);

  const canSend = input.trim().length > 0 && !isStreaming;
  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages]
  );
  const visibleTranscript = interimTranscript || "按住说话，松开发送";
  const settingsCharCount = settingsDraft.trim().length;
  const canSaveSettings =
    settingsCharCount >= 20 && settingsCharCount <= 4000 && !isSavingSettings;

  function getAdminHeaders(password = adminPassword) {
    return password.trim()
      ? {
          "x-admin-password": password.trim()
        }
      : undefined;
  }

  async function loadSettings(password = adminPassword) {
    setIsLoadingSettings(true);
    setSettingsStatus(null);

    try {
      const response = await fetch("/api/settings", {
        cache: "no-store",
        headers: getAdminHeaders(password)
      });
      const data = (await response.json()) as ConversationSettingsResponse;

      if (!response.ok) {
        throw new Error(data.error || "后台设置读取失败");
      }

      setSettingsDraft(data.systemPrompt);
      setDefaultSystemPrompt(data.defaultSystemPrompt);
      setSettingsUpdatedAt(data.updatedAt);
      if (password.trim()) {
        window.sessionStorage.setItem("aicom-admin-password", password.trim());
      }
    } catch (caught) {
      const problem =
        caught instanceof Error ? caught.message : "后台设置读取失败，请稍后重试";
      setSettingsStatus(problem);
    } finally {
      setIsLoadingSettings(false);
    }
  }

  async function openSettings() {
    setIsSettingsOpen(true);
    setSettingsStatus(null);

    if (settingsDraft) {
      return;
    }

    const savedPassword = window.sessionStorage.getItem("aicom-admin-password") || "";
    setAdminPassword(savedPassword);
    await loadSettings(savedPassword);
  }

  async function saveSettings() {
    setIsSavingSettings(true);
    setSettingsStatus(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders()
        },
        body: JSON.stringify({ systemPrompt: settingsDraft })
      });
      const data = (await response.json()) as ConversationSettingsResponse;

      if (!response.ok) {
        throw new Error(data.error || "后台设置保存失败");
      }

      setSettingsDraft(data.systemPrompt);
      setDefaultSystemPrompt(data.defaultSystemPrompt);
      setSettingsUpdatedAt(data.updatedAt);
      setSettingsStatus("已保存，下一轮对话生效");
    } catch (caught) {
      const problem =
        caught instanceof Error ? caught.message : "后台设置保存失败，请稍后重试";
      setSettingsStatus(problem);
    } finally {
      setIsSavingSettings(false);
    }
  }

  function restoreDefaultPrompt() {
    if (!defaultSystemPrompt) {
      return;
    }

    setSettingsDraft(defaultSystemPrompt);
    setSettingsStatus("已恢复默认内容，保存后生效");
  }

  async function sendMessage(userText: string, options?: { autoSpeak?: boolean }) {
    const cleanText = userText.trim();
    if (!cleanText || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: cleanText
    };
    const assistantId = createId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: ""
    };
    const nextMessages = [...messages, userMessage, assistantMessage];
    let assistantText = "";
    let shouldAutoSpeak = false;

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== assistantId)
            .map(({ role, content }) => ({ role, content }))
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.error || "聊天接口暂时不可用");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + chunk }
              : message
          )
        );
      }

      shouldAutoSpeak = Boolean(options?.autoSpeak && assistantText.trim());
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        const message =
          caught instanceof Error ? caught.message : "聊天请求失败，请稍后重试";
        setError(message);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId && item.content.length === 0
              ? { ...item, content: "请求失败：" + message }
              : item
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }

    if (shouldAutoSpeak) {
      await speakTextForMessage(assistantId, assistantText);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSend) {
      void sendMessage(input);
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  function resetChat() {
    messages.forEach((message) => {
      if (message.audioUrl) {
        URL.revokeObjectURL(message.audioUrl);
      }
    });
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    finalTranscriptRef.current = "";
    liveTranscriptRef.current = "";
    shouldSendVoiceRef.current = false;
    setMessages(initialMessages);
    setError(null);
    setInput("");
    setInterimTranscript("");
    setVoiceState("idle");
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1200);
  }

  async function speakTextForMessage(messageId: string, text: string) {
    if (!text.trim()) {
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, isSpeaking: true } : item
      )
    );
    setError(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.error || "语音合成失败");
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      setMessages((current) =>
        current.map((item) => {
          if (item.id !== messageId) {
            return item;
          }
          if (item.audioUrl) {
            URL.revokeObjectURL(item.audioUrl);
          }
          return { ...item, audioUrl };
        })
      );

      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (caught) {
      const problem =
        caught instanceof Error ? caught.message : "语音合成失败，请稍后重试";
      setError(problem);
    } finally {
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, isSpeaking: false } : item
        )
      );
    }
  }

  function speakMessage(message: ChatMessage) {
    void speakTextForMessage(message.id, message.content);
  }

  function startVoiceCapture(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (isStreaming || voiceState === "listening") {
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setVoiceState("unsupported");
      setError("当前浏览器不支持语音识别，可以先使用下方文本输入。");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    finalTranscriptRef.current = "";
    liveTranscriptRef.current = "";
    shouldSendVoiceRef.current = true;
    setInterimTranscript("");
    setError(null);

    recognition.onstart = () => {
      setVoiceState("listening");
    };

    recognition.onerror = (speechError) => {
      shouldSendVoiceRef.current = false;
      setVoiceState("idle");
      setError(
        speechError.error === "not-allowed"
          ? "麦克风权限被拒绝，请允许浏览器使用麦克风。"
          : "语音识别中断了，可以再按住试一次。"
      );
    };

    recognition.onresult = (speechEvent) => {
      let interim = "";

      for (let index = speechEvent.resultIndex; index < speechEvent.results.length; index += 1) {
        const result = speechEvent.results[index];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal) {
          finalTranscriptRef.current += transcript;
        } else {
          interim += transcript;
        }
      }

      const liveTranscript = (finalTranscriptRef.current + interim).trim();
      liveTranscriptRef.current = liveTranscript;
      setInterimTranscript(liveTranscript);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      const finalText = finalTranscriptRef.current.trim() || liveTranscriptRef.current.trim();
      setVoiceState("idle");
      setInterimTranscript("");

      if (shouldSendVoiceRef.current && finalText) {
        void sendMessage(finalText, { autoSpeak: true });
      } else if (shouldSendVoiceRef.current) {
        setError("没有听清楚，可以按住圆形按钮再说一次。");
      }
      shouldSendVoiceRef.current = false;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setVoiceState("idle");
      recognitionRef.current = null;
      setError("语音识别启动失败，请刷新页面后再试。");
    }
  }

  function stopVoiceCapture() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    setVoiceState("processing");
    recognition.stop();
  }

  return (
    <main className="min-h-screen overflow-hidden px-4 py-4 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col rounded-[8px] border border-line bg-white/90 shadow-soft backdrop-blur">
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-ink text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold">aicom voice</h1>
              <p className="text-xs text-muted">日常对话 · DeepSeek Flash · Qwen-TTS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-coral px-3 text-sm text-coral transition hover:bg-coral hover:text-white"
                type="button"
                onClick={stopStreaming}
              >
                <Square className="h-4 w-4" />
                停止
              </button>
            ) : (
              <button
                className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-accent hover:text-accent"
                title="换个示例"
                type="button"
                onClick={() =>
                  setInput(samplePrompts[Math.floor(Math.random() * samplePrompts.length)])
                }
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-accent hover:text-accent"
              title="后台设置"
              type="button"
              onClick={() => void openSettings()}
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-coral hover:text-coral"
              title="清空对话"
              type="button"
              onClick={resetChat}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
          <div className="flex min-h-[420px] flex-col border-b border-line bg-[#fbfbf8] lg:border-b-0 lg:border-r">
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((message) => (
                  <article
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    key={message.id}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-accent text-white">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[min(720px,calc(100vw-5rem))] rounded-[8px] border px-4 py-3 ${
                        message.role === "user"
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.content || (
                          <span className="inline-flex items-center gap-2 text-muted">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            正在想
                          </span>
                        )}
                      </div>
                      {message.role === "assistant" && message.content && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-line px-2 text-xs text-muted transition hover:border-accent hover:text-accent"
                            type="button"
                            onClick={() => copyMessage(message)}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            复制
                          </button>
                          <button
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-line px-2 text-xs text-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
                            disabled={message.isSpeaking}
                            onClick={() => speakMessage(message)}
                          >
                            {message.isSpeaking ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                            朗读
                          </button>
                          {message.audioUrl && (
                            <audio
                              className="h-8 max-w-full"
                              controls
                              src={message.audioUrl}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-white text-ink">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>

            {error && (
              <div className="mx-4 mb-3 rounded-[8px] border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral sm:mx-6">
                {error}
              </div>
            )}

            <form className="border-t border-line bg-white p-3 sm:p-4" onSubmit={handleSubmit}>
              <div className="mx-auto flex max-w-3xl items-end gap-2">
                <textarea
                  className="min-h-[46px] flex-1 rounded-[8px] border border-line bg-white px-3 py-3 text-sm leading-5 outline-none transition placeholder:text-muted focus:border-accent"
                  placeholder="也可以打字聊，按 Enter 发送"
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  className="grid h-[46px] w-[46px] place-items-center rounded-[8px] bg-accent text-white transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:bg-muted"
                  type="submit"
                  disabled={!canSend}
                  title="发送"
                >
                  {isStreaming ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </div>

          <aside className="flex flex-col items-center justify-between gap-5 bg-white px-5 py-6">
            <div className="w-full rounded-[8px] border border-line bg-surface px-4 py-3">
              <div className="text-sm font-medium">语音对话</div>
              <p className="mt-1 text-xs leading-5 text-muted">
                按住说话，松开后自动发送。回复完成后会自动播放语音。
              </p>
            </div>

            <div className="flex w-full flex-1 flex-col items-center justify-center">
              <div
                className={`relative grid h-48 w-48 place-items-center rounded-full ${
                  voiceState === "listening" ? "voice-ring" : ""
                }`}
              >
                <button
                  className={`relative z-10 grid h-36 w-36 touch-none place-items-center rounded-full border text-white shadow-soft transition duration-200 ${
                    voiceState === "listening"
                      ? "scale-105 border-coral bg-coral"
                      : "border-accent bg-accent hover:scale-105 hover:bg-[#0b5f59]"
                  } disabled:cursor-not-allowed disabled:bg-muted`}
                  type="button"
                  disabled={isStreaming || voiceState === "processing"}
                  onPointerDown={startVoiceCapture}
                  onPointerUp={stopVoiceCapture}
                  onPointerCancel={stopVoiceCapture}
                  onPointerLeave={() => {
                    if (voiceState === "listening") {
                      stopVoiceCapture();
                    }
                  }}
                >
                  {voiceState === "unsupported" ? (
                    <MicOff className="h-12 w-12" />
                  ) : voiceState === "processing" ? (
                    <Loader2 className="h-12 w-12 animate-spin" />
                  ) : voiceState === "listening" ? (
                    <Pause className="h-12 w-12" />
                  ) : (
                    <Mic className="h-12 w-12" />
                  )}
                </button>
              </div>

              <div className="mt-4 min-h-[52px] w-full rounded-[8px] border border-line bg-[#fbfbf8] px-4 py-3 text-center text-sm leading-6 text-ink">
                {voiceState === "listening"
                  ? visibleTranscript
                  : voiceState === "processing"
                    ? "正在整理你刚才说的话"
                    : isStreaming
                      ? "我在回复，稍等一下"
                      : visibleTranscript}
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 text-xs text-muted">
              <div className="rounded-[8px] border border-line px-3 py-2">
                <div>聊天模型</div>
                <div className="mt-1 font-medium text-ink">DeepSeek Flash</div>
              </div>
              <div className="rounded-[8px] border border-line px-3 py-2">
                <div>语音回复</div>
                <div className="mt-1 font-medium text-ink">Qwen-TTS</div>
              </div>
            </div>

            {latestAssistant?.isSpeaking && (
              <div className="inline-flex items-center gap-2 rounded-[8px] bg-accent/10 px-3 py-2 text-sm text-accent">
                <Volume2 className="h-4 w-4" />
                正在播放回复
              </div>
            )}
          </aside>
        </section>
      </div>
      {isSettingsOpen && (
        <div className="settings-overlay">
          <section className="settings-dialog">
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-semibold">后台设置</h2>
                <p className="text-xs text-muted">
                  {formatSettingsUpdatedAt(settingsUpdatedAt)}
                </p>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-coral hover:text-coral"
                title="关闭"
                type="button"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <label className="text-sm font-medium" htmlFor="system-prompt">
                对话提示词
              </label>
              <div className="mb-3 mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className="h-10 flex-1 rounded-[8px] border border-line bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-accent"
                  placeholder="后台密码"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                />
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-line px-3 text-sm text-muted transition hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                  disabled={isLoadingSettings}
                  type="button"
                  onClick={() => void loadSettings()}
                >
                  {isLoadingSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                  读取
                </button>
              </div>
              <textarea
                className="mt-2 min-h-[300px] w-full rounded-[8px] border border-line bg-[#fbfbf8] px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-muted focus:border-accent disabled:cursor-wait disabled:opacity-70"
                disabled={isLoadingSettings || !settingsDraft}
                id="system-prompt"
                value={settingsDraft}
                onChange={(event) => setSettingsDraft(event.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>{settingsCharCount}/4000</span>
                <span>20 字以上可保存</span>
              </div>
              {settingsStatus && (
                <div className="mt-3 rounded-[8px] border border-line bg-surface px-3 py-2 text-sm text-ink">
                  {settingsStatus}
                </div>
              )}
            </div>

            <footer className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-line px-3 text-sm text-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoadingSettings || !defaultSystemPrompt}
                type="button"
                onClick={restoreDefaultPrompt}
              >
                <RotateCcw className="h-4 w-4" />
                恢复默认
              </button>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] border border-line px-3 text-sm text-muted transition hover:border-ink hover:text-ink sm:flex-none"
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <X className="h-4 w-4" />
                  关闭
                </button>
                <button
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] bg-accent px-3 text-sm text-white transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:bg-muted sm:flex-none"
                  disabled={!canSaveSettings}
                  type="button"
                  onClick={() => void saveSettings()}
                >
                  {isSavingSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  保存
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
