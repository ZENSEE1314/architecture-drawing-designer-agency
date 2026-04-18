"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DownloadBar({ submissionId, title }: { submissionId: string; title: string }) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  async function regenerate() {
    setRegenerating(true);
    setError("");
    try {
      const r = await fetch(`/api/submissions/${submissionId}/generate`, { method: "POST" });
      if (!r.ok) throw new Error((await r.text()).slice(0, 200));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function downloadJson() {
    const res = await fetch(`/api/submissions/${submissionId}`);
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atelier-${slug(title)}-${submissionId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-3 border hairline p-4">
      <div className="flex-1">
        <p className="font-display text-lg">Take it with you</p>
        <p className="text-xs text-neutral-600">
          PDF prints all three proposals with page breaks. JSON exports the raw brief + samples.
        </p>
      </div>
      <button
        onClick={() => window.print()}
        className="rounded-full bg-ink px-5 py-2 text-sm text-paper hover:bg-neutral-800"
      >
        Download PDF
      </button>
      <button
        onClick={downloadJson}
        className="rounded-full border hairline px-5 py-2 text-sm hover:bg-neutral-100"
      >
        Download JSON
      </button>
      <button
        onClick={regenerate}
        disabled={regenerating}
        className="rounded-full border hairline px-5 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        {regenerating ? "Regenerating…" : "Regenerate"}
      </button>
      {error && <span className="basis-full text-xs text-red-600">{error}</span>}
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "brief";
}
