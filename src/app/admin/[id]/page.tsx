import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmission } from "@/lib/store";
import SampleView from "@/components/SampleView";
import AdminActions from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDetailPage({ params }: Props) {
  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub) notFound();

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-neutral-500 hover:underline">
            ← All briefs
          </Link>
          <h1 className="mt-2 font-display text-4xl">{sub.project.siteAddress}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {sub.client.name} · {sub.client.email}
          </p>
        </div>
        <div className="text-xs text-neutral-500">Ref: {sub.id}</div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border hairline p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Project
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <dt className="text-neutral-500">Plot</dt>
              <dd>{sub.project.plotDescription}</dd>
            </div>
            {sub.project.totalAreaSqm && (
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-neutral-500">Total area</dt>
                <dd>{sub.project.totalAreaSqm} sqm</dd>
              </div>
            )}
            {sub.project.floorPlanUrl && (
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-neutral-500">Floor plan</dt>
                <dd>
                  <a
                    href={sub.project.floorPlanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    View
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="border hairline p-5">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Preferences
          </h2>
          <dl className="space-y-2 text-sm">
            <Chips label="Styles" items={sub.preferences.styles} />
            <Chips label="Constraints" items={sub.preferences.constraints} />
            <Chips label="Deliverables" items={sub.preferences.deliverables} />
            {sub.preferences.notes && (
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <dt className="text-neutral-500">Notes</dt>
                <dd>{sub.preferences.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <section className="border hairline p-5">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-neutral-500">
          Levels ({sub.levels.length})
        </h2>
        <ol className="space-y-3 text-sm">
          {sub.levels.map((l, i) => (
            <li key={i} className="grid gap-2 border-b hairline pb-3 last:border-b-0 md:grid-cols-[140px_1fr_2fr]">
              <div className="font-medium">{l.levelName}</div>
              <div>{l.businessPurpose}</div>
              <div className="text-neutral-600">{l.layoutNotes}</div>
            </li>
          ))}
        </ol>
      </section>

      <AdminActions id={sub.id} status={sub.status} />

      {sub.samples && sub.samples.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-display text-3xl">Three proposals</h2>
          {sub.samples.map((s) => (
            <SampleView key={s.id} sample={s} />
          ))}
        </section>
      )}
    </div>
  );
}

function Chips({ label, items }: { label: string; items: readonly string[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="flex flex-wrap gap-1">
        {items.map((i) => (
          <span key={i} className="rounded-full border hairline px-2 py-0.5 text-xs">
            {i.replace(/-/g, " ")}
          </span>
        ))}
      </dd>
    </div>
  );
}
