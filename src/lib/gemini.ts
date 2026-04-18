import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "node:fs";
import path from "node:path";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
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

export async function generateImage(req: ImageRequest): Promise<ImageResult> {
  const index = req.index ?? 0;
  try {
    const res = await client().models.generateContent({
      model: MODEL,
      contents: req.prompt,
      config: { responseModalities: ["Image"] },
    });

    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      return { role: req.role, index, url: null, error: "No image in Gemini response" };
    }

    const buf = Buffer.from(imagePart.inlineData.data, "base64");
    const filename = `${req.sampleId}-${req.role}${index ? `-${index}` : ""}.png`;
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

export async function generateImagesParallel(
  requests: ImageRequest[],
): Promise<ImageResult[]> {
  return Promise.all(requests.map(generateImage));
}
