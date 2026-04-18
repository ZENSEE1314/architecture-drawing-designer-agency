# Railway Deployment — Atelier

This app deploys to Railway as a single Docker service. Inference runs on Ollama Cloud (no self-hosted GPU needed).

## One-time setup

### 1 · Ollama Cloud key

1. Go to https://ollama.com and sign in.
2. Settings → API keys → create a new key. Copy it.
3. Verify the model you want is available on cloud, e.g. `gemma3:27b-cloud`.

### 2 · Create the Railway project

1. https://railway.com/new → **Deploy from GitHub repo**.
2. Select `ZENSEE1314/architecture-drawing-designer-agency`.
3. Railway detects the `Dockerfile` and builds.

### 3 · Environment variables

In the Railway service → **Variables**, add:

| Key | Value |
|---|---|
| `OLLAMA_HOST` | `https://ollama.com` |
| `OLLAMA_MODEL` | `gemma3:27b-cloud` (or whichever cloud model you prefer) |
| `OLLAMA_API_KEY` | `<your Ollama Cloud key>` |
| `ADMIN_TOKEN` | `<a long random string>` |

### 4 · Persistent storage (SQLite + uploads)

Railway containers are ephemeral. Add a **Volume** so the database and uploaded floor plans survive redeploys.

1. Service → **Volumes** → **New Volume**.
2. Mount path: `/app/data` — size 1 GB is plenty for the SQLite DB.
3. Add a **second Volume** with mount path `/app/public/uploads` if you want uploaded floor plans to persist too.

### 5 · Public domain

Service → **Settings** → **Networking** → **Generate Domain**. Done — your app is live.

## Redeploys

Every push to `main` on GitHub triggers a redeploy. No manual step.

## Troubleshooting

- **`Ollama 401`** in the generate endpoint → `OLLAMA_API_KEY` missing or wrong.
- **`Ollama 404 model not found`** → the model name doesn't exist on Ollama Cloud. List available models at https://ollama.com/library.
- **Lost data after redeploy** → the Volume isn't mounted at `/app/data`.
- **Upload `413`** → Railway's default body limit. This app already sets `bodySizeLimit: 25mb` in `next.config.mjs`.
