import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            Concept · Material · Structure
          </p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] md:text-6xl">
            Upload a floor plan. <br />
            Receive three proposals.
          </h1>
          <p className="mt-6 max-w-xl text-neutral-600">
            Atelier is a concept-stage architecture studio for mixed-use commercial
            projects. Give us the site, the plan, and the business per level — we
            return three distinct design directions with facade, materials, and
            structural strategy.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/submit"
              className="rounded-full bg-ink px-6 py-3 text-sm text-paper hover:bg-neutral-800"
            >
              Start a brief
            </Link>
            <Link
              href="/admin"
              className="rounded-full border hairline px-6 py-3 text-sm hover:bg-neutral-100"
            >
              Agency dashboard
            </Link>
          </div>
        </div>
        <div className="aspect-[4/3] w-full border hairline p-6">
          <svg viewBox="0 0 400 300" className="h-full w-full">
            <rect x="1" y="1" width="398" height="298" fill="none" stroke="#111" />
            <line x1="140" y1="1" x2="140" y2="299" stroke="#111" />
            <line x1="260" y1="1" x2="260" y2="299" stroke="#111" />
            <line x1="1" y1="120" x2="399" y2="120" stroke="#111" />
            <line x1="140" y1="200" x2="260" y2="200" stroke="#111" />
            <text x="70" y="65" textAnchor="middle" fontSize="11" fill="#111">
              RETAIL
            </text>
            <text x="200" y="65" textAnchor="middle" fontSize="11" fill="#111">
              LOBBY
            </text>
            <text x="330" y="65" textAnchor="middle" fontSize="11" fill="#111">
              F&amp;B
            </text>
            <text x="70" y="220" textAnchor="middle" fontSize="11" fill="#111">
              CORE
            </text>
            <text x="200" y="165" textAnchor="middle" fontSize="11" fill="#111">
              COWORK
            </text>
            <text x="200" y="255" textAnchor="middle" fontSize="11" fill="#111">
              EVENT
            </text>
            <text x="330" y="260" textAnchor="middle" fontSize="11" fill="#111">
              GARDEN
            </text>
          </svg>
        </div>
      </section>

      <section className="grid gap-8 border-t hairline pt-10 md:grid-cols-3">
        {[
          {
            n: "01",
            t: "Brief",
            d: "Upload your floor plan. Describe the business per level, site context, and constraints.",
          },
          {
            n: "02",
            t: "Generate",
            d: "Hit submit. In under a minute you get three distinct design directions — style, structure, facade, materials.",
          },
          {
            n: "03",
            t: "Compare",
            d: "See all three side by side with zoning, materials schedule, and structural strategy. Pick what fits.",
          },
        ].map((s) => (
          <div key={s.n}>
            <div className="font-display text-4xl text-neutral-300">{s.n}</div>
            <div className="mt-2 font-display text-xl">{s.t}</div>
            <p className="mt-2 text-sm text-neutral-600">{s.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
