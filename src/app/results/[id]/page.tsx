import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmission } from "@/lib/store";
import SampleView from "@/components/SampleView";
import DownloadBar from "./DownloadBar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub) notFound();

  const ready = sub.samples && sub.samples.length > 0;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-neutral-500 hover:underline">
            ← New brief
          </Link>
          <h1 className="mt-2 font-display text-4xl">
            {sub.project.siteAddress}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {sub.levels.length} level{sub.levels.length === 1 ? "" : "s"} ·{" "}
            {sub.preferences.styles.length
              ? sub.preferences.styles.join(", ").replace(/-/g, " ")
              : "open style"}
          </p>
        </div>
        <div className="text-xs text-neutral-500">Ref: {sub.id.slice(0, 8)}</div>
      </header>

      {ready ? (
        <>
          <DownloadBar submissionId={sub.id} title={sub.project.siteAddress} />
          <section className="space-y-6 print-samples">
            <h2 className="font-display text-3xl">Your three proposals</h2>
            {sub.samples!.map((s) => (
              <SampleView key={s.id} sample={s} />
            ))}
          </section>
        </>
      ) : (
        <section className="border hairline p-10 text-center">
          <p className="font-display text-2xl">Still generating…</p>
          <p className="mt-2 text-sm text-neutral-600">
            Refresh this page in a few seconds. If nothing appears after a minute,{" "}
            <Link href="/submit" className="underline">
              start a new brief
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
