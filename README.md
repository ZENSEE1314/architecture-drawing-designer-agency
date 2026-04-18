# Atelier — Architecture Drawing Agency

A concept-stage architecture agency platform. Clients upload a floor plan and describe the business per level. The agency reviews and triggers an LLM to generate three distinct design proposals — each with floor-plan schematics (SVG), facade concept, material schedule, and structural notes.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS
- **Ollama** for generation (default: local `gemma3:latest`; works with Ollama Cloud too)
- **SQLite** for persistence via `better-sqlite3` — DB file at `data/atelier.db`
- File uploads stored under `public/uploads/`

## Setup

### 1 · Install Ollama and pull a model

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh
# Windows: download installer from https://ollama.com/download

ollama pull gemma3          # or gemma3:27b, or any model you prefer
ollama serve                # runs on http://localhost:11434
```

### 2 · Run the app

```bash
npm install
cp .env.example .env.local
# edit .env.local if you want a non-default model or Ollama Cloud
npm run dev
```

Open http://localhost:3000.

The SQLite DB is created on first use at `data/atelier.db`. Tables: `submissions`, `levels`.

## Flow

1. **Client** fills in `/submit` — site, levels/business per floor, style and constraint preferences, floor plan upload.
2. **Agency** opens `/admin`, selects the brief, clicks **Generate 3 proposals**. Ollama returns three samples with different styles + cost tiers.
3. **Agency** reviews in-page and marks one **finalized**.

## Deliverables per sample

- Concept statement + style tag + cost tier + estimated build time
- Per-level floor plan (SVG schematic) with zoning, circulation, dimensions
- Facade elevation (SVG) with description and material callouts
- Zone-by-zone material schedule (walls / floor / ceiling / joinery)
- Structural system note (grid, spans, core, load strategy)
- Sustainability strategy

## Data model

```
submissions
  id (pk) · created_at · status
  client_name · client_email · client_phone
  site_address · total_area_sqm · plot_description · floor_plan_url
  styles_json · constraints_json · deliverables_json · preferences_notes
  admin_notes · samples_json

levels
  id (pk) · submission_id (fk) · level_order
  level_name · business_purpose · layout_notes · area_sqm
```

`samples_json` holds the LLM-generated proposals. All other fields are normalized columns.

## Switching models / providers

Override via env:

```
OLLAMA_HOST=https://ollama.com          # Ollama Cloud
OLLAMA_MODEL=gemma3:27b-cloud           # or gpt-oss:20b-cloud, qwen3-coder:480b-cloud, etc.
OLLAMA_API_KEY=ollama_...               # only if your endpoint requires auth
```

The chat call uses Ollama's native `/api/chat` endpoint with `format: "json"`.

## Admin token

Set `ADMIN_TOKEN` in `.env.local` to gate generate/finalize. Paste it into the admin detail page action panel. If unset, actions are open (local dev).

## Notes

- Concept-stage only — not construction drawings.
- SVG outputs from the model are sanitized (`src/lib/svg.ts`) before render.
- `data/atelier.db` is gitignored. Back it up if you care about the data.
