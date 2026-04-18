import { NextRequest, NextResponse } from "next/server";
import { createSubmission, listSubmissions } from "@/lib/store";
import type { Submission } from "@/lib/types";

export async function GET() {
  const items = await listSubmissions();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Omit<Submission, "id" | "createdAt" | "status">;
  if (!body?.client?.email || !body?.project?.siteAddress || !body?.levels?.length) {
    return NextResponse.json(
      { error: "Missing required fields (client.email, project.siteAddress, levels)" },
      { status: 400 },
    );
  }
  const s = await createSubmission(body);
  return NextResponse.json({ id: s.id });
}
