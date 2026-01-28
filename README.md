# 🍳 Cooked

> You were never meant to cook this.

**Cooked** is a cursed AI web app that generates **fake, unhinged dishes** and **AI-generated images** of them.  
It exists somewhere between a joke, a demo, and a crime against food.

Built with a static frontend and a **Cloudflare Worker backend** to safely proxy AI requests without exposing API keys.

---

## ✨ Features

- 🤖 AI-generated fictional dishes (text)
- 🖼️ AI-generated images of cursed food
- 🔁 “MAKE IT WORSE” button for iterative chaos
- 🔐 API key kept server-side (no frontend leaks)
- 🚫 No CORS issues, no browser errors
- ⚡ Fast, serverless, zero build step

---

## 🧠 Architecture

Browser (HTML / CSS / JS)
↓
Cloudflare Worker (API proxy)
↓
HackAI (Text + Image models)


### Why this setup?
- Browsers block direct AI API calls (CORS)
- API keys should never live in frontend code
- Image generation requires server-side requests

Cloudflare Workers solve all of this cleanly.

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- Vanilla JavaScript

### Backend
- Cloudflare Workers
- HackAI Proxy API

### Models Used
- **Text:** `qwen/qwen3-32b`
- **Images:** `google/gemini-2.5-flash-image`

---

## 🚀 Deployment

### Backend (Cloudflare Worker)

```bash
wrangler deploy
```

## NOTE

THIS API KEY WAS MY OWN I WILL NOT DISCLOSE THE BACKEND REPO DUE TO IT HAVING THE API KEY HARDCODED
