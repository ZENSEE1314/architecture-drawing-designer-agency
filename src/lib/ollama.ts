import type { Sample, Style, Submission } from "./types";
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
  "levels": [{ "levelName": string, "zoning": string, "circulation": string, "dimensionsNote": string, "floorPlanPrompt": string }],
  "facade": { "description": string, "materialCallouts": string[] },
  "imagePrompts": {
    "exterior": string,
    "interior": string,
    "axonometric": string,
    "sketch": string
  },
  "materials": [{ "zone": string, "walls": string, "floor": string, "ceiling": string, "joinery": string }],
  "structure": { "system": string, "grid": string, "spans": string, "coreStrategy": string, "loadStrategy": string },
  "sustainability": string,
  "estimatedBuildTime": string,
  "costTier": "budget" | "mid" | "premium"
}

Rules:
- Produce EXACTLY 3 samples. Each sample must use a different style AND a different costTier.
- Image prompts must be detailed (60-120 words each), specifying style, materials, lighting, camera angle, time of day.
  - floorPlanPrompt: "2D architectural floor plan, top-down orthographic view, [room layout], dimensioned walls with double lines, door swings as quarter arcs, windows as parallel lines, furniture icons, grid paper background, black ink on white, professional CAD drawing style, no perspective, no color" — fill in zoning.
  - exterior: photorealistic architectural render of the facade, specify materials + style + sky + context
  - interior: photorealistic interior hero shot of the primary zone, specify materials + lighting + furniture + mood
  - axonometric: isometric axonometric cutaway 3D view of the building showing all levels, clean line drawing with light material shading, white background
  - sketch: hand-drawn architectural sketch of the facade in ink and light watercolor wash, competition-board style, loose confident linework
- Zoning text must match what the floorPlanPrompt describes.
- Material callouts must be specific (e.g. "fluted precast concrete panels, 1200mm module" not "concrete").`;

type LlmSchemaSample = {
  title?: string;
  concept?: string;
  style?: Style;
  levels?: {
    levelName?: string;
    zoning?: string;
    circulation?: string;
    dimensionsNote?: string;
    floorPlanPrompt?: string;
  }[];
  facade?: { description?: string; materialCallouts?: string[] };
  imagePrompts?: {
    exterior?: string;
    interior?: string;
    axonometric?: string;
    sketch?: string;
  };
  materials?: Sample["materials"];
  structure?: Sample["structure"];
  sustainability?: string;
  estimatedBuildTime?: string;
  costTier?: Sample["costTier"];
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
  const rawSamples: unknown[] = Array.isArray(parsed?.samples) ? parsed.samples : [];
  const normalized = rawSamples.slice(0, 3).map((s, i) => normalize(s as LlmSchemaSample, i));

  // Fire image generation across all samples in parallel.
  if (geminiAvailable()) {
    const imageReqs: ImageRequest[] = [];
    rawSamples.slice(0, 3).forEach((rawAny, sampleIdx) => {
      const raw = rawAny as LlmSchemaSample;
      const sampleId = `sample-${sampleIdx + 1}`;
      const p = raw.imagePrompts;
      if (p?.exterior) imageReqs.push({ submissionId: sub.id, sampleId, role: "exterior", prompt: p.exterior });
      if (p?.interior) imageReqs.push({ submissionId: sub.id, sampleId, role: "interior", prompt: p.interior });
      if (p?.axonometric) imageReqs.push({ submissionId: sub.id, sampleId, role: "axonometric", prompt: p.axonometric });
      if (p?.sketch) imageReqs.push({ submissionId: sub.id, sampleId, role: "sketch", prompt: p.sketch });
      (raw.levels ?? []).forEach((l, levelIdx) => {
        if (l.floorPlanPrompt) {
          imageReqs.push({
            submissionId: sub.id,
            sampleId,
            role: "level",
            index: levelIdx,
            prompt: l.floorPlanPrompt,
          });
        }
      });
    });

    const results = await generateImagesParallel(imageReqs);
    imageReqs.forEach((req, i) => {
      const r = results[i];
      if (!r?.url) return;
      const sample = normalized.find((s) => s.id === req.sampleId);
      if (!sample) return;
      if (req.role === "level") {
        const idx = req.index ?? 0;
        if (sample.levels[idx]) sample.levels[idx].floorPlanUrl = r.url;
      } else {
        sample.renders ??= {};
        if (req.role === "exterior") sample.renders.exteriorUrl = r.url;
        else if (req.role === "interior") sample.renders.interiorUrl = r.url;
        else if (req.role === "axonometric") sample.renders.axonometricUrl = r.url;
        else if (req.role === "sketch") sample.renders.sketchUrl = r.url;
      }
    });
  }

  return normalized;
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
