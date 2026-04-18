import { NextRequest, NextResponse } from "next/server";
import { getSubmission, updateSubmission } from "@/lib/store";
import { generateSamples } from "@/lib/ollama";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const sub = await getSubmission(id);
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await updateSubmission(id, { status: "generating" });
  try {
    const samples = await generateSamples(sub);
    const updated = await updateSubmission(id, { samples, status: "generated" });
    return NextResponse.json(updated);
  } catch (e) {
    await updateSubmission(id, { status: "submitted" });
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
