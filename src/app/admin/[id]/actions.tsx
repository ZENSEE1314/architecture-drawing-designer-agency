"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/submissions/${id}/generate`, {
        method: "POST",
        headers: token ? { "x-admin-token": token } : undefined,
      });
      if (!r.ok) throw new Error(await r.text());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({ status: "finalized" }),
      });
      if (!r.ok) throw new Error(await r.text());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border hairline p-5">
      <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
        Agency actions
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="password"
          placeholder="Admin token (if set)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="border hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-full bg-ink px-5 py-2 text-sm text-paper disabled:opacity-50"
        >
          {busy
            ? "Generating…"
            : status === "generated"
              ? "Regenerate 3 proposals"
              : "Generate 3 proposals"}
        </button>
        {status === "generated" && (
          <button
            onClick={finalize}
            disabled={busy}
            className="rounded-full border hairline px-5 py-2 text-sm hover:bg-neutral-100"
          >
            Mark finalized
          </button>
        )}
        <span className="text-xs text-neutral-500">Status: {status}</span>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
