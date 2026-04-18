import type { Sample, Style, Submission } from "./types";
import { sanitizeSvg, fallbackSvg } from "./svg";

const DEFAULT_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "gemma3:latest";

function host(): string {
  return (process.env.OLLAMA_HOST || DEFAULT_HOST).replace(/\/+$/, "");
}
function model(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
}

const SYSTEM_PROMPT = `You are a senior architect at a boutique design agency producing concept-stage deliverables for mixed-use commercial projects.

You MUST return a single JSON object with this exact shape — no prose, no markdown fences:
{ "samples": Sample[] }

Sample:
{
  "title": string,
  "concept": string,
  "style": "modern-minimalist" | "industrial-loft" | "biophilic-organic" | "contemporary-tropical",
  "levels": [{ "levelName": string, "zoning": string, "circulation": string, "dimensionsNote": string, "svgFloorPlan": string }],
  "facade": { "description": string, "materialCallouts": string[], "svgElevation": string },
  "materials": [{ "zone": string, "walls": string, "floor": string, "ceiling": string, "joinery": string }],
  "structure": { "system": string, "grid": string, "spans": string, "coreStrategy": string, "loadStrategy": string },
  "sustainability": string,
  "estimatedBuildTime": string,
  "costTier": "budget" | "mid" | "premium"
}

Rules:
- Produce EXACTLY 3 samples. Each sample must use a different style AND a different costTier.
- Floor plan zoning must respect the client's business purpose per level and feasible circulation (cores, lifts, stairs, fire egress).
- Facade material callouts must be specific (e.g. "fluted precast concrete panels, 1200mm module" not "concrete").
- Material schedule rows must cover each zone named in zoning.
- svgFloorPlan and svgElevation must be valid SVG strings starting with <svg and ending with </svg>, using viewBox (e.g. "0 0 400 300"), black (#111) stroke-only linework on no fill, <text> labels for rooms, no scripts, no external resources.`;

type SchemaSample = Omit<Sample, "id">;

function buildUserPrompt(sub: Submission): string {
  return [
    `Project brief:`,
    `Site: ${sub.project.siteAddress}`,
    `Plot: ${sub.project.plotDescription}`,
    sub.project.totalAreaSqm ? `Total area: ${sub.project.totalAreaSqm} sqm` : "",
    ``,
    `Levels (${sub.levels.length}):`,
    ...sub.levels.map(
      (l, i) =>
        `  L${i + 1} — ${l.levelName}: ${l.businessPurpose}. Layout: ${l.layoutNotes}${l.areaSqm ? ` (${l.areaSqm} sqm)` : ""}`,
    ),
    ``,
    `Preferences:`,
    `  Styles allowed: ${sub.preferences.styles.join(", ") || "any"}`,
    `  Constraints: ${sub.preferences.constraints.join(", ") || "none"}`,
    `  Deliverables required: ${sub.preferences.deliverables.join(", ")}`,
    `  Notes: ${sub.preferences.notes || "—"}`,
    ``,
    `Return the JSON object now.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateSamples(sub: Submission): Promise<Sample[]> {
  const url = `${host()}/api/chat`;
  const body = {
    model: model(),
    stream: false,
    format: "json",
    options: { temperature: 0.6, num_ctx: 8192 },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(sub) },
    ],
  };

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.OLLAMA_API_KEY) {
    headers["authorization"] = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as { message?: { content?: string }; response?: string };
  const content = json.message?.content ?? json.response ?? "";
  const parsed = extractJson(content);
  const rawSamples = Array.isArray(parsed?.samples) ? parsed.samples : [];
  return rawSamples.slice(0, 3).map((s: SchemaSample, i: number) => normalize(s, i));
}

function extractJson(text: string): { samples?: unknown[] } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(body.slice(start, end + 1));
}

function normalize(s: SchemaSample, i: number): Sample {
  const style: Style = (s.style as Style) ?? "modern-minimalist";
  return {
    id: `sample-${i + 1}`,
    title: s.title ?? `Sample ${i + 1}`,
    concept: s.concept ?? "",
    style,
    levels: (s.levels ?? []).map((l) => ({
      levelName: l.levelName ?? "",
      zoning: l.zoning ?? "",
      circulation: l.circulation ?? "",
      dimensionsNote: l.dimensionsNote ?? "",
      svgFloorPlan: l.svgFloorPlan
        ? sanitizeSvg(l.svgFloorPlan)
        : fallbackSvg(l.levelName ?? "Level"),
    })),
    facade: {
      description: s.facade?.description ?? "",
      materialCallouts: s.facade?.materialCallouts ?? [],
      svgElevation: s.facade?.svgElevation
        ? sanitizeSvg(s.facade.svgElevation)
        : fallbackSvg("Elevation"),
    },
    materials: s.materials ?? [],
    structure: s.structure ?? {
      system: "",
      grid: "",
      spans: "",
      coreStrategy: "",
      loadStrategy: "",
    },
    sustainability: s.sustainability ?? "",
    estimatedBuildTime: s.estimatedBuildTime ?? "",
    costTier: s.costTier ?? "mid",
  };
}
