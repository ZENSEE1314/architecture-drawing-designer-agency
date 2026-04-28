"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALL_CONSTRAINTS,
  ALL_DELIVERABLES,
  ALL_STYLES,
  type Constraint,
  type Deliverable,
  type LevelBrief,
  type Style,
} from "@/lib/types";
import { rememberBrief } from "./RecentBriefs";

type FormState = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  siteAddress: string;
  plotDescription: string;
  totalAreaSqm: string;
  levels: LevelBrief[];
  styles: Style[];
  constraints: Constraint[];
  deliverables: Deliverable[];
  notes: string;
};

const EMPTY_LEVEL: LevelBrief = { levelName: "", businessPurpose: "", layoutNotes: "" };

export default function SubmissionForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    siteAddress: "",
    plotDescription: "",
    totalAreaSqm: "",
    levels: [{ ...EMPTY_LEVEL, levelName: "Ground floor" }],
    styles: [],
    constraints: [],
    deliverables: ["floor-plan-annotated", "elevation-facade", "material-schedule", "structural-note"],
    notes: "",
  });
  const [uploading, setUploading] = useState(false);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "designing">("idle");
  const [error, setError] = useState<string>("");

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { url: string };
      setFloorPlanUrl(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setPhase("saving");
    setError("");
    try {
      const body = {
        client: {
          name: state.clientName,
          email: state.clientEmail,
          phone: state.clientPhone || undefined,
        },
        project: {
          siteAddress: state.siteAddress,
          totalAreaSqm: state.totalAreaSqm ? Number(state.totalAreaSqm) : undefined,
          plotDescription: state.plotDescription,
          floorPlanUrl: floorPlanUrl || undefined,
        },
        levels: state.levels.filter((l) => l.levelName && l.businessPurpose),
        preferences: {
          styles: state.styles,
          constraints: state.constraints,
          deliverables: state.deliverables,
          notes: state.notes,
        },
      };
      const r = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      const { id } = (await r.json()) as { id: string };

      rememberBrief({
        id,
        title: state.siteAddress || "Untitled brief",
        createdAt: new Date().toISOString(),
      });

      setPhase("designing");
      const g = await fetch(`/api/submissions/${id}/generate`, { method: "POST" });
      if (!g.ok) {
        const msg = await g.text();
        throw new Error(`Designer error: ${msg.slice(0, 300)}`);
      }
      router.push(`/results/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setPhase("idle");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-4 w-full font-display text-2xl">1 — Client</legend>
        <Input
          label="Name"
          value={state.clientName}
          onChange={(v) => setState({ ...state, clientName: v })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={state.clientEmail}
          onChange={(v) => setState({ ...state, clientEmail: v })}
          required
        />
        <Input
          label="Phone (optional)"
          value={state.clientPhone}
          onChange={(v) => setState({ ...state, clientPhone: v })}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-4 font-display text-2xl">2 — Project & site</legend>
        <Input
          label="Site address"
          value={state.siteAddress}
          onChange={(v) => setState({ ...state, siteAddress: v })}
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Total plot area (sqm, optional)"
            type="number"
            value={state.totalAreaSqm}
            onChange={(v) => setState({ ...state, totalAreaSqm: v })}
          />
          <Input
            label="Plot description"
            placeholder="e.g. corner lot, 18m × 32m, south-facing"
            value={state.plotDescription}
            onChange={(v) => setState({ ...state, plotDescription: v })}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-neutral-600">
            Floor plan (image or PDF)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
            className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-paper hover:file:bg-neutral-800"
          />
          {uploading && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
          {floorPlanUrl && (
            <p className="mt-1 text-xs text-forest">Uploaded: {floorPlanUrl}</p>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 font-display text-2xl">3 — Levels & business per floor</legend>
        <div className="space-y-4">
          {state.levels.map((lvl, i) => (
            <div key={i} className="grid gap-3 border hairline p-4 md:grid-cols-[1fr_1fr_2fr_auto]">
              <Input
                label="Level name"
                value={lvl.levelName}
                onChange={(v) => {
                  const next = [...state.levels];
                  next[i] = { ...lvl, levelName: v };
                  setState({ ...state, levels: next });
                }}
              />
              <Input
                label="Business purpose"
                placeholder="e.g. ground retail, L2 coworking"
                value={lvl.businessPurpose}
                onChange={(v) => {
                  const next = [...state.levels];
                  next[i] = { ...lvl, businessPurpose: v };
                  setState({ ...state, levels: next });
                }}
              />
              <Input
                label="Layout notes"
                placeholder="zones, flow, must-haves"
                value={lvl.layoutNotes}
                onChange={(v) => {
                  const next = [...state.levels];
                  next[i] = { ...lvl, layoutNotes: v };
                  setState({ ...state, levels: next });
                }}
              />
              <button
                type="button"
                className="self-end rounded border hairline px-3 py-2 text-xs hover:bg-neutral-100"
                onClick={() =>
                  setState({ ...state, levels: state.levels.filter((_, j) => j !== i) })
                }
                disabled={state.levels.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setState({ ...state, levels: [...state.levels, { ...EMPTY_LEVEL }] })
          }
          className="mt-3 rounded-full border hairline px-4 py-2 text-sm hover:bg-neutral-100"
        >
          + Add level
        </button>
      </fieldset>

      <fieldset>
        <legend className="mb-4 font-display text-2xl">4 — Style preferences</legend>
        <p className="mb-3 text-sm text-neutral-600">Pick any. Leave empty for our choice.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_STYLES.map((s) => (
            <Chip
              key={s.id}
              active={state.styles.includes(s.id)}
              onClick={() => setState({ ...state, styles: toggle(state.styles, s.id) })}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 font-display text-2xl">5 — Constraints</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {ALL_CONSTRAINTS.map((c) => (
            <label key={c.id} className="flex items-start gap-3 border hairline p-3 text-sm">
              <input
                type="checkbox"
                checked={state.constraints.includes(c.id)}
                onChange={() =>
                  setState({ ...state, constraints: toggle(state.constraints, c.id) })
                }
                className="mt-1"
              />
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-neutral-600">{c.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 font-display text-2xl">6 — Deliverables</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_DELIVERABLES.map((d) => (
            <Chip
              key={d.id}
              active={state.deliverables.includes(d.id)}
              onClick={() =>
                setState({ ...state, deliverables: toggle(state.deliverables, d.id) })
              }
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 font-display text-2xl">7 — Anything else</legend>
        <textarea
          value={state.notes}
          onChange={(e) => setState({ ...state, notes: e.target.value })}
          rows={4}
          className="w-full border hairline bg-paper p-3 text-sm outline-none focus:border-ink"
          placeholder="References, adjacencies, must-avoid, stakeholder concerns…"
        />
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4 border-t hairline pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-ink px-6 py-3 text-sm text-paper disabled:opacity-50"
        >
          {phase === "saving"
            ? "Saving brief…"
            : phase === "designing"
              ? "Designing your proposals…"
              : "Generate my 3 proposals"}
        </button>
        <p className="text-xs text-neutral-500">
          {phase === "designing"
            ? "This takes up to a minute. Keep this tab open."
            : "Three distinct design directions, ready on the next screen."}
        </p>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-neutral-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active ? "border-ink bg-ink text-paper" : "hairline hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}
