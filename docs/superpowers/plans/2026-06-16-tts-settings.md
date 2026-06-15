# TTS Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-editable TTS parameters and switch production voice to Maia.

**Architecture:** Extend the existing settings store with a `tts` object. Pass normalized TTS settings from `/api/tts` into the existing TTS adapter instead of exposing secrets to the browser.

**Tech Stack:** Next.js route handlers, React settings dialog, TypeScript, Vitest, DashScope Qwen realtime WebSocket.

---

### Task 1: Settings Model

**Files:**
- Modify: `lib/settings.ts`
- Modify: `lib/settings.test.ts`

- [ ] Write failing tests for default Maia TTS settings and normalization.
- [ ] Run `npm.cmd test -- lib/settings.test.ts` and verify the tests fail.
- [ ] Implement `TtsSettings`, defaults, and validation.
- [ ] Run `npm.cmd test -- lib/settings.test.ts` and verify the tests pass.

### Task 2: TTS Route And Provider

**Files:**
- Modify: `app/api/tts/route.ts`
- Modify: `lib/tts/index.ts`
- Modify: `lib/tts/providers/dashscope-qwen-realtime.ts`
- Modify: `lib/tts/providers/dashscope-qwen-realtime.test.ts`

- [ ] Write failing tests proving instructions are included only when present and model/voice overrides are applied.
- [ ] Run the focused provider test and verify it fails.
- [ ] Pass settings-derived TTS parameters into `synthesizeSpeech`.
- [ ] Run the focused provider test and verify it passes.

### Task 3: Admin UI

**Files:**
- Modify: `components/chat/chat-workspace.tsx`

- [ ] Add TTS fields to settings response and local state.
- [ ] Save `systemPrompt` and `tts` together.
- [ ] Add compact controls for model, voice, language, format, and instructions.

### Task 4: Verify And Deploy

**Files:**
- Modify: `.env.example`
- Server: `/opt/aicom/.env.production`

- [ ] Run `npm.cmd test`.
- [ ] Run `npm.cmd run typecheck`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Update server `TTS_VOICE=Maia`.
- [ ] Redeploy/restart the Docker Compose service.
- [ ] Verify `/api/health` and the public page return HTTP 200.
