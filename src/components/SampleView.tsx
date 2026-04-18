/* eslint-disable @next/next/no-img-element */
import type { Sample } from "@/lib/types";

const COST_TIER_LABEL: Record<Sample["costTier"], string> = {
  budget: "Budget",
  mid: "Mid",
  premium: "Premium",
};

export default function SampleView({ sample }: { sample: Sample }) {
  const r = sample.renders;
  const hasRenders = !!(r?.exteriorUrl || r?.interiorUrl || r?.axonometricUrl || r?.sketchUrl);

  return (
    <article className="border hairline">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b hairline p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {sample.style.replace(/-/g, " ")}
          </p>
          <h3 className="mt-1 font-display text-2xl">{sample.title}</h3>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border hairline px-3 py-1">
            {COST_TIER_LABEL[sample.costTier]}
          </span>
          <span className="rounded-full border hairline px-3 py-1">
            {sample.estimatedBuildTime}
          </span>
        </div>
      </header>

      <section className="border-b hairline p-5">
        <p className="max-w-3xl text-neutral-700">{sample.concept}</p>
      </section>

      {hasRenders && (
        <Section title="Renders">
          <div className="grid gap-4 md:grid-cols-2">
            {r?.exteriorUrl && <Figure src={r.exteriorUrl} caption="Exterior — photorealistic" />}
            {r?.interiorUrl && <Figure src={r.interiorUrl} caption="Interior — hero shot" />}
            {r?.axonometricUrl && <Figure src={r.axonometricUrl} caption="Axonometric — 3D massing" />}
            {r?.sketchUrl && <Figure src={r.sketchUrl} caption="Sketch — concept" />}
          </div>
        </Section>
      )}

      <Section title="Floor plans by level">
        <div className="grid gap-6 md:grid-cols-2">
          {sample.levels.map((lvl, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h4 className="font-display text-lg">{lvl.levelName}</h4>
                <span className="text-xs text-neutral-500">{lvl.dimensionsNote}</span>
              </div>
              {lvl.floorPlanUrl ? (
                <img
                  src={lvl.floorPlanUrl}
                  alt={`${lvl.levelName} floor plan`}
                  className="block w-full border hairline bg-white"
                />
              ) : lvl.svgFloorPlan ? (
                <div
                  className="svg-wrap border hairline bg-paper"
                  dangerouslySetInnerHTML={{ __html: lvl.svgFloorPlan }}
                />
              ) : null}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-neutral-500">Zoning</dt>
                <dd>{lvl.zoning}</dd>
                <dt className="text-neutral-500">Circulation</dt>
                <dd>{lvl.circulation}</dd>
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Facade & materials">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="text-sm text-neutral-700">{sample.facade.description}</p>
            <ul className="space-y-1 text-sm">
              {sample.facade.materialCallouts.map((m, i) => (
                <li key={i} className="border-l-2 border-ink pl-3">
                  {m}
                </li>
              ))}
            </ul>
          </div>
          {sample.facade.svgElevation && !r?.exteriorUrl && (
            <div
              className="svg-wrap border hairline bg-paper"
              dangerouslySetInnerHTML={{ __html: sample.facade.svgElevation }}
            />
          )}
        </div>
      </Section>

      <Section title="Material schedule">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b hairline text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Zone</th>
                <th className="py-2 pr-3">Walls</th>
                <th className="py-2 pr-3">Floor</th>
                <th className="py-2 pr-3">Ceiling</th>
                <th className="py-2">Joinery</th>
              </tr>
            </thead>
            <tbody>
              {sample.materials.map((m, i) => (
                <tr key={i} className="border-b hairline last:border-b-0">
                  <td className="py-2 pr-3 font-medium">{m.zone}</td>
                  <td className="py-2 pr-3">{m.walls}</td>
                  <td className="py-2 pr-3">{m.floor}</td>
                  <td className="py-2 pr-3">{m.ceiling}</td>
                  <td className="py-2">{m.joinery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Structural system">
        <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          <Row label="System" value={sample.structure.system} />
          <Row label="Grid" value={sample.structure.grid} />
          <Row label="Spans" value={sample.structure.spans} />
          <Row label="Core" value={sample.structure.coreStrategy} />
          <Row label="Load strategy" value={sample.structure.loadStrategy} />
        </dl>
      </Section>

      {sample.sustainability && (
        <Section title="Sustainability">
          <p className="text-sm text-neutral-700">{sample.sustainability}</p>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b hairline p-5 last:border-b-0">
      <h3 className="mb-4 text-xs uppercase tracking-[0.2em] text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Figure({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="space-y-1">
      <img
        src={src}
        alt={caption}
        className="block w-full border hairline bg-white"
        loading="lazy"
      />
      <figcaption className="text-xs text-neutral-500">{caption}</figcaption>
    </figure>
  );
}
