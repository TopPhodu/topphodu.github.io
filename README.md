# Puneet Nahata Portfolio + Digital Twin

High-end static portfolio website with a Cloudflare Worker-backed AI assistant ("Digital Twin") that answers questions about Puneet's career using resume-grounded context.

## Architecture

```text
Browser (Static Site)
  ├─ index.html
  ├─ styles.css
  ├─ script.js
  └─ chat.js
        │  POST /  { history: [...] }
        ▼
Cloudflare Worker (puneet-digital-twin/src/index.js)
        │  OpenRouter Chat Completions API
        ▼
Model: openai/gpt-oss-120b:free
```

### Runtime flow

1. User sends a chat message from the widget.
2. Frontend persists chat history in `localStorage`.
3. Frontend sends only recent turns (context window) to Worker.
4. Worker injects profile/resume context in the system prompt.
5. Worker returns JSON response:
   - `{ "reply": "..." }`

## Repository Layout

```text
.
├── index.html                  # static page + chat widget markup
├── styles.css                  # portfolio and chat styling
├── script.js                   # theme/nav/timeline/reveal behaviors
├── chat.js                     # chat UI, memory, formatting, reset session
├── puneet-digital-twin/
│   ├── wrangler.jsonc          # active worker config
│   ├── src/index.js            # active worker source for deploy
│   └── package.json
├── assets/
└── puneet_nahata_principal_resume.md
```

Note: Deploy uses `puneet-digital-twin/src/index.js` (configured in `wrangler.jsonc`)

## Getting Started

### 1) Run the static site locally

From repo root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

### 2) Run Cloudflare Worker locally

```bash
cd puneet-digital-twin
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npm run dev
```

If Wrangler asks to create Worker when adding secret, answer `yes`.

### 3) Wire frontend to Worker

Update `data-chat-endpoint` in `index.html`:

```html
<body data-theme="dark" data-chat-endpoint="https://YOUR-WORKER.workers.dev">
```

For local Worker testing, use the local URL printed by `wrangler dev` (typically `http://127.0.0.1:8787`).

## Deploy

### Deploy Worker

```bash
cd puneet-digital-twin
npm run deploy
```

### Deploy static website

Deploy root static files (`index.html`, `styles.css`, `script.js`, `chat.js`, `assets/`) to:
- GitHub Pages, or
- AWS S3 static website hosting.

## Useful Commands

From repo root:

```bash
# JS syntax checks
node --check script.js
node --check chat.js
node --check puneet-digital-twin/src/index.js

# quick local static server
python3 -m http.server 8080
```

From `puneet-digital-twin/`:

```bash
# local worker
npm run dev

# deploy worker
npm run deploy

# run tests (template tests currently need updating if worker behavior changed)
npm test
```

## Useful Prompts

### Digital Twin end-user prompts

- "Summarize your Amazon AdTech impact with metrics."
- "What scale and latency have you handled across roles?"
- "What did you deliver at JPMorgan Chase Travel?"
- "Which skills are strongest for principal backend roles?"
- "Compare your Priceline and Amazon architecture work."

### Contributor prompts (for AI coding assistants)

- "Update the profile context in `puneet-digital-twin/src/index.js` using only resume facts."
- "Improve chat readability in `chat.js` and `styles.css` without changing layout."
- "Add a new starter prompt chip and keep dark/light mode compatibility."
- "Add a guardrail in Worker to reject oversized history payloads."

## Important Notes

- Wrangler v4 does not support `wrangler init ... --javascript`.
  - Use `npm create cloudflare@latest` or `npx wrangler init` (prompt-based).
- Keep claims grounded in resume/profile context.
- Do not commit secrets. Use `wrangler secret put OPENROUTER_API_KEY`.
