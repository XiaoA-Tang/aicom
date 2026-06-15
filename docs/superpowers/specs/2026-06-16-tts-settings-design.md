# TTS Settings Design

## Goal

Let the deployed aicom app use `TTS_VOICE=Maia` and allow the admin settings panel to edit safe TTS parameters without exposing provider secrets.

## Scope

The settings panel will manage conversation prompt text plus a small TTS profile:

- Qwen realtime model
- Voice name
- Language type
- Audio format
- Optional speaking instructions for instruct-capable models

API keys and provider base URLs remain server-only environment variables.

## Data Flow

`/api/settings` reads and writes `.data/conversation-settings.json`. `/api/tts` reads those settings and passes the TTS profile into the provider adapter. Provider adapters still fall back to `.env` values when a setting is not present, so existing deployments keep working.

## Validation

Settings validation trims text, rejects invalid enum values, and bounds instruction length. The default voice becomes `Maia`. Tests cover defaults, normalization, saved settings, and provider payload shaping.

## Deployment

The server `.env.production` will be updated to `TTS_VOICE=Maia`. The app container will be restarted after local checks pass.
