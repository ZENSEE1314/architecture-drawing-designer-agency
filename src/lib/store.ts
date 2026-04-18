import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type { LevelBrief, Sample, Submission } from "./types";

type SubmissionRow = {
  id: string;
  created_at: string;
  status: Submission["status"];
  client_name: string;
  client_email: string;
  client_phone: string | null;
  site_address: string;
  total_area_sqm: number | null;
  plot_description: string;
  floor_plan_url: string | null;
  styles_json: string;
  constraints_json: string;
  deliverables_json: string;
  preferences_notes: string | null;
  admin_notes: string | null;
  samples_json: string | null;
};

type LevelRow = {
  submission_id: string;
  level_order: number;
  level_name: string;
  business_purpose: string;
  layout_notes: string;
  area_sqm: number | null;
};

function toSubmission(row: SubmissionRow, levels: LevelBrief[]): Submission {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    client: {
      name: row.client_name,
      email: row.client_email,
      phone: row.client_phone ?? undefined,
    },
    project: {
      siteAddress: row.site_address,
      totalAreaSqm: row.total_area_sqm ?? undefined,
      plotDescription: row.plot_description,
      floorPlanUrl: row.floor_plan_url ?? undefined,
    },
    levels,
    preferences: {
      styles: JSON.parse(row.styles_json),
      constraints: JSON.parse(row.constraints_json),
      deliverables: JSON.parse(row.deliverables_json),
      notes: row.preferences_notes ?? "",
    },
    samples: row.samples_json ? (JSON.parse(row.samples_json) as Sample[]) : undefined,
    adminNotes: row.admin_notes ?? undefined,
  };
}

function toLevel(row: LevelRow): LevelBrief {
  return {
    levelName: row.level_name,
    businessPurpose: row.business_purpose,
    layoutNotes: row.layout_notes,
    areaSqm: row.area_sqm ?? undefined,
  };
}

async function hydrateLevels(ids: string[]): Promise<Map<string, LevelBrief[]>> {
  const db = await getDb();
  const map = new Map<string, LevelBrief[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT submission_id, level_order, level_name, business_purpose, layout_notes, area_sqm
       FROM levels WHERE submission_id IN (${placeholders})
       ORDER BY submission_id, level_order`,
    )
    .all(...ids) as LevelRow[];
  for (const r of rows) {
    const arr = map.get(r.submission_id) ?? [];
    arr.push(toLevel(r));
    map.set(r.submission_id, arr);
  }
  return map;
}

export async function listSubmissions(): Promise<Submission[]> {
  const db = await getDb();
  const rows = db
    .prepare(`SELECT * FROM submissions ORDER BY created_at DESC`)
    .all() as SubmissionRow[];
  const levels = await hydrateLevels(rows.map((r) => r.id));
  return rows.map((r) => toSubmission(r, levels.get(r.id) ?? []));
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const db = await getDb();
  const row = db
    .prepare(`SELECT * FROM submissions WHERE id = ?`)
    .get(id) as SubmissionRow | undefined;
  if (!row) return null;
  const levels = await hydrateLevels([id]);
  return toSubmission(row, levels.get(id) ?? []);
}

export async function createSubmission(
  input: Omit<Submission, "id" | "createdAt" | "status">,
): Promise<Submission> {
  const db = await getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const insertSub = db.prepare(
    `INSERT INTO submissions
     (id, created_at, status, client_name, client_email, client_phone,
      site_address, total_area_sqm, plot_description, floor_plan_url,
      styles_json, constraints_json, deliverables_json, preferences_notes)
     VALUES (?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertLvl = db.prepare(
    `INSERT INTO levels (submission_id, level_order, level_name, business_purpose, layout_notes, area_sqm)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    insertSub.run(
      id,
      createdAt,
      input.client.name,
      input.client.email,
      input.client.phone ?? null,
      input.project.siteAddress,
      input.project.totalAreaSqm ?? null,
      input.project.plotDescription,
      input.project.floorPlanUrl ?? null,
      JSON.stringify(input.preferences.styles),
      JSON.stringify(input.preferences.constraints),
      JSON.stringify(input.preferences.deliverables),
      input.preferences.notes ?? null,
    );
    input.levels.forEach((l, i) => {
      insertLvl.run(
        id,
        i,
        l.levelName,
        l.businessPurpose,
        l.layoutNotes,
        l.areaSqm ?? null,
      );
    });
  });
  tx();

  const created = await getSubmission(id);
  if (!created) throw new Error("Failed to read back created submission");
  return created;
}

export async function updateSubmission(
  id: string,
  patch: Partial<Submission>,
): Promise<Submission | null> {
  const db = await getDb();
  const existing = db
    .prepare(`SELECT id FROM submissions WHERE id = ?`)
    .get(id) as { id: string } | undefined;
  if (!existing) return null;

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.status !== undefined) {
    sets.push("status = ?");
    vals.push(patch.status);
  }
  if (patch.samples !== undefined) {
    sets.push("samples_json = ?");
    vals.push(JSON.stringify(patch.samples));
  }
  if (patch.adminNotes !== undefined) {
    sets.push("admin_notes = ?");
    vals.push(patch.adminNotes);
  }
  if (sets.length > 0) {
    vals.push(id);
    db.prepare(`UPDATE submissions SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }
  return getSubmission(id);
}
