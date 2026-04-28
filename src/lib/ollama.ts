import type { LevelDesign, Sample, Style, Submission } from "./types";
import { fallbackSvg } from "./svg";
import {
  generateImagesParallel,
  geminiAvailable,
  type ImageRequest,
} from "./gemini";

const DEFAULT_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "gemma3:latest";

function host(): string {
  return (process.env.OLLAMA_HOST || DEFAULT_HOST).replace(/\/+$/, "");
}
function model(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
}

const SYSTEM_PROMPT = `You are a senior architect at a boutique design agency producing concept-stage proposals for mixed-use commercial projects.

You MUST return a single JSON object with this exact shape — no prose, no markdown fences:
{ "samples": Sample[] }

Sample:
{
  "title": string,
  "concept": string,
  "style": "modern-minimalist" | "industrial-loft" | "biophilic-organic" | "contemporary-tropical",
  "levels": [{ "levelName": string, "zoning": string, "circulation": string, "dimensionsNote": string }],
  "facade": { "description": string, "materialCallouts": string[] },
  "materials": [{ "zone": string, "walls": string, "floor": string, "ceiling": string, "joinery": string }],
  "structure": { "system": string, "grid": string, "spans": string, "coreStrategy": string, "loadStrategy": string },
  "sustainability": string,
  "estimatedBuildTime": string,
  "costTier": "budget" | "mid" | "premium"
}

Rules:
- Produce EXACTLY 3 samples. Each sample must use a different style AND a different costTier.
- Material callouts must be specific (e.g. "fluted precast concrete panels, 1200mm module" not "concrete").
- Zoning text must list rooms with relative positions (e.g. "Game House (Left), KTV Hall 1 (Center), KTV Hall 2 (Right)").`;

type LlmSchemaSample = {
  title?: string;
  concept?: string;
  style?: Style;
  levels?: {
    levelName?: string;
    zoning?: string;
    circulation?: string;
    dimensionsNote?: string;
  }[];
  facade?: { description?: string; materialCallouts?: string[] };
  materials?: Sample["materials"];
  structure?: Sample["structure"];
  sustainability?: string;
  estimatedBuildTime?: string;
  costTier?: Sample["costTier"];
};

const STYLE_HINTS: Record<Style, string> = {
  "modern-minimalist":
    "modern minimalist style, clean lines, glass and concrete, muted palette of warm white and charcoal, large openings, soft daylight",
  "industrial-loft":
    "industrial loft style, exposed steel structure, raw concrete, exposed brick, black metal mullions, warehouse character, dramatic lighting",
  "biophilic-organic":
    "biophilic organic style, integrated greenery, timber slats, natural stone, curved organic forms, abundant daylight, plants spilling over balconies",
  "contemporary-tropical":
    "contemporary tropical style, deep overhanging eaves, vertical timber louvers, white render walls, lush landscaping, dappled tropical sunlight",
};

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
  const rawSamples: unknown[] = Array.isArray(parsed?.samples) ? parsed.samples : [];
  const normalized = rawSamples.slice(0, 3).map((s, i) => normalize(s as LlmSchemaSample, i));

  if (geminiAvailable() && normalized.length > 0) {
    await runImagePipeline(sub, normalized);
  } else if (!geminiAvailable()) {
    console.warn("[arch-agency] GEMINI_API_KEY not set — skipping image generation");
  }

  return normalized;
}

async function runImagePipeline(sub: Submission, samples: Sample[]): Promise<void> {
  const reqs: ImageRequest[] = [];
  for (const s of samples) {
    const styleHint = STYLE_HINTS[s.style];
    const matCallouts = s.facade.materialCallouts.slice(0, 3).join(", ");
    const baseContext = `${styleHint}. Materials: ${matCallouts || s.facade.description}.`;

    reqs.push({
      submissionId: sub.id,
      sampleId: s.id,
      role: "exterior",
      prompt: `Photorealistic architectural exterior render of a mixed-use commercial building, ${baseContext} ${s.levels.length}-storey volume. Camera at eye level, three-quarter view, golden hour, high detail, professional architectural photography, no people, no text, no watermark.`,
    });

    const groundLevel = sub.levels[0];
    reqs.push({
      submissionId: sub.id,
      sampleId: s.id,
      role: "interior",
      prompt: `Photorealistic interior hero shot of the ${groundLevel?.businessPurpose ?? "ground floor"}, ${styleHint}. Wide-angle camera, soft natural lighting, designer furniture, ${matCallouts}. Magazine-quality interior photography, no people, no text.`,
    });

    reqs.push({
      submissionId: sub.id,
      sampleId: s.id,
      role: "axonometric",
      prompt: `Architectural isometric axonometric cutaway 3D view of a ${s.levels.length}-storey mixed-use building showing all levels stacked, ${styleHint}. Clean technical line drawing with light pastel material shading, 45-degree angle, white background, no people, no text. Each level labeled.`,
    });

    reqs.push({
      submissionId: sub.id,
      sampleId: s.id,
      role: "sketch",
      prompt: `Hand-drawn architectural sketch of the building facade in black ink and light watercolor wash, ${styleHint}. Loose confident linework, competition presentation board style, slight pencil construction lines, on cream paper. No text, no labels.`,
    });

    s.levels.forEach((lvl, i) => {
      const briefLvl = sub.levels[i];
      const purpose = briefLvl?.businessPurpose ?? "";
      const zoning = lvl.zoning || briefLvl?.layoutNotes || "";
      reqs.push({
        submissionId: sub.id,
        sampleId: s.id,
        role: "level",
        index: i,
        prompt: `Top-down 2D architectural floor plan drawing of ${lvl.levelName}, function: ${purpose}. Layout: ${zoning}. Show double-line walls, door swings as quarter arcs, windows as parallel lines, dimension lines with measurements in meters, room labels, furniture icons (sofas, tables, beds, chairs as appropriate). Black ink linework on white grid paper, professional CAD drawing style, orthographic projection, no perspective, no color shading, no people, north arrow in corner.`,
      });
    });
  }

  console.log(`[arch-agency] Firing ${reqs.length} Gemini image requests`);
  const results = await generateImagesParallel(reqs);

  let succeeded = 0;
  let failed = 0;
  reqs.forEach((req, i) => {
    const r = results[i];
    if (!r?.url) {
      failed++;
      if (r?.error) console.error(`[arch-agency] Gemini ${req.role}${req.index ?? ""}: ${r.error}`);
      return;
    }
    succeeded++;
    const sample = samples.find((s) => s.id === req.sampleId);
    if (!sample) return;
    if (req.role === "level") {
      const idx = req.index ?? 0;
      const lvl: LevelDesign | undefined = sample.levels[idx];
      if (lvl) lvl.floorPlanUrl = r.url;
    } else {
      sample.renders ??= {};
      if (req.role === "exterior") sample.renders.exteriorUrl = r.url;
      else if (req.role === "interior") sample.renders.interiorUrl = r.url;
      else if (req.role === "axonometric") sample.renders.axonometricUrl = r.url;
      else if (req.role === "sketch") sample.renders.sketchUrl = r.url;
    }
  });
  console.log(`[arch-agency] Gemini results — ${succeeded} ok, ${failed} failed`);
}

function extractJson(text: string): { samples?: unknown[] } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(body.slice(start, end + 1));
}

function normalize(s: LlmSchemaSample, i: number): Sample {
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
      svgFloorPlan: fallbackSvg(l.levelName ?? "Level"),
    })),
    facade: {
      description: s.facade?.description ?? "",
      materialCallouts: s.facade?.materialCallouts ?? [],
      svgElevation: fallbackSvg("Elevation"),
    },
    renders: undefined,
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
