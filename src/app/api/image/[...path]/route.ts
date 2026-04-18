import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  if (!segments?.length) return NextResponse.json({ error: "bad path" }, { status: 400 });

  const rel = segments.join("/");
  if (rel.includes("..") || rel.startsWith("/")) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }

  const filePath = path.join(UPLOADS_DIR, rel);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const ui8 = new Uint8Array(data);
    return new NextResponse(ui8, {
      status: 200,
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
