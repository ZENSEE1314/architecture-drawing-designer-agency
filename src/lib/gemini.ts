import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "node:fs";
import path from "node:path";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export function geminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey });
}

export type ImageRequest = {
  submissionId: string;
  sampleId: string;
  role: string;
  index?: number;
  prompt: string;
};

export type ImageResult = {
  role: string;
  index: number;
  url: string | null;
  error?: string;
};

const GEMINI_TIMEOUT_MS = 60_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export async function generateImage(req: ImageRequest): Promise<ImageResult> {
  const index = req.index ?? 0;
  try {
    const res = await withTimeout(
      client().models.generateContent({
        model: MODEL,
        contents: req.prompt,
        config: { responseModalities: ["Image"] },
      }),
      GEMINI_TIMEOUT_MS,
    );

    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      const finishReason = res.candidates?.[0]?.finishReason;
      return { role: req.role, index, url: null, error: `No image in Gemini response (finishReason=${finishReason ?? "?"})` };
    }

    const buf = Buffer.from(imagePart.inlineData.data, "base64");
    const filename = `${req.sampleId}-${req.role}${req.role === "level" ? `-${index}` : ""}.png`;
    const dir = path.join(UPLOADS_DIR, req.submissionId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), buf);

    return {
      role: req.role,
      index,
      url: `/api/image/${req.submissionId}/${filename}`,
    };
  } catch (e) {
    return {
      role: req.role,
      index,
      url: null,
      error: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
    };
  }
}

// Rate-limit pacing for Google AI Studio free tier (~10 RPM).
// We space the START of each call by GAP_MS but let the actual HTTP requests
// run concurrently — so the in-flight count caps naturally at GAP_MS / call_duration.
const MAX_RPM = Number(process.env.GEMINI_MAX_RPM) || 8;
const GAP_MS = Math.ceil(60_000 / MAX_RPM);

let lastStart = 0;
let pacingTail: Promise<void> = Promise.resolve();

function paceStart(): Promise<void> {
  pacingTail = pacingTail.then(async () => {
    const wait = Math.max(0, lastStart + GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
  });
  return pacingTail;
}

export async function generateImagesParallel(
  requests: ImageRequest[],
): Promise<ImageResult[]> {
  return Promise.all(
    requests.map(async (r) => {
      await paceStart();
      return generateImage(r);
    }),
  );
}
