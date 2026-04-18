import Link from "next/link";
import { listSubmissions } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-neutral-100 text-neutral-700",
  generating: "bg-amber-100 text-amber-900",
  generated: "bg-emerald-100 text-emerald-900",
  finalized: "bg-ink text-paper",
  draft: "bg-neutral-50 text-neutral-500",
};

export default async function AdminListPage() {
  const items = await listSubmissions();
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Dashboard</p>
          <h1 className="mt-2 font-display text-4xl">Briefs</h1>
        </div>
        <p className="text-sm text-neutral-600">{items.length} total</p>
      </header>

      {items.length === 0 ? (
        <div className="border hairline p-10 text-center text-neutral-500">
          No submissions yet.{" "}
          <Link href="/submit" className="underline">
            Create one
          </Link>
          .
        </div>
      ) : (
        <div className="border hairline">
          <table className="w-full text-sm">
            <thead className="border-b hairline text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="p-3">Created</th>
                <th className="p-3">Client</th>
                <th className="p-3">Site</th>
                <th className="p-3">Levels</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b hairline last:border-b-0">
                  <td className="p-3 text-neutral-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div>{s.client.name}</div>
                    <div className="text-xs text-neutral-500">{s.client.email}</div>
                  </td>
                  <td className="p-3">{s.project.siteAddress}</td>
                  <td className="p-3">{s.levels.length}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${STATUS_STYLES[s.status] ?? ""}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/${s.id}`}
                      className="text-sm underline hover:no-underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
