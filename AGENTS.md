# AGENTS.md

This file helps human and AI contributors work safely and quickly in this repo.

## Project Purpose

Static personal portfolio website for Puneet Nahata, with a Digital Twin chat assistant.

- Frontend: pure static HTML/CSS/vanilla JS.
- AI backend: Cloudflare Worker proxy to OpenRouter.
- No server runtime required for the website itself.

## Current Architecture

1. User opens static site (`index.html` + `styles.css` + `script.js` + `chat.js`).
2. Chat widget sends `POST` request with recent history to Worker URL.
3. Worker injects profile/resume context into system prompt.
4. Worker calls OpenRouter model `openai/gpt-oss-120b:free`.
5. Worker returns `{ "reply": "..." }`.

## Key Files

- `index.html`: page structure + chat widget markup + `data-chat-endpoint`.
- `styles.css`: portfolio design + chat widget styles.
- `script.js`: theme toggle, sticky nav, timeline accordion, reveal animations.
- `chat.js`: chat UI behavior, memory, message rendering, session reset.
- `puneet-digital-twin/src/index.js`: Worker implementation source used by Wrangler deploy.
- `puneet_nahata_principal_resume.md`: base resume content source.

## Source of Truth Notes

- Worker deploy path is configured via `puneet-digital-twin/wrangler.jsonc` (`main: "src/index.js"`).
- Chat endpoint is configured in `<body data-chat-endpoint="...">` in `index.html`.

## Frontend Chat Behavior

- Chat memory is stored in browser `localStorage`.
- Sends only recent context window (last ~10 messages) to backend.
- Includes starter prompts, typing indicator, and a `New Chat` reset action.
- Assistant responses support lightweight formatting (paragraphs/lists/strong/code).

## Deployment Expectations

- Website deploy target: GitHub Pages or AWS S3 static hosting.
- Worker deploy target: Cloudflare Workers.
- Required Worker secret: `OPENROUTER_API_KEY`.

## Safe Change Guidelines

- Keep frontend dependency-free unless strictly necessary.
- Preserve responsive layout, dark/light compatibility, and accessibility labels.
- Keep Digital Twin grounded in resume/profile facts; do not add unsupported claims.
- Prefer small, focused changes over broad refactors.

## Quick Validation

- Syntax checks:
  - `node --check script.js`
  - `node --check chat.js`
  - `node --check puneet-digital-twin/src/index.js`
- Frontend local run:
  - `python3 -m http.server 8080`
- Worker local run:
  - `cd puneet-digital-twin && npm run dev`

