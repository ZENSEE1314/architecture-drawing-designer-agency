"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "atelier_recent_briefs";

export type RecentBrief = {
  id: string;
  title: string;
  createdAt: string;
};

export function rememberBrief(b: RecentBrief): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: RecentBrief[] = raw ? JSON.parse(raw) : [];
    const next = [b, ...list.filter((x) => x.id !== b.id)].slice(0, 10);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function readBriefs(): RecentBrief[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentBrief[]) : [];
  } catch {
    return [];
  }
}

export default function RecentBriefs({ className = "" }: { className?: string }) {
  const [briefs, setBriefs] = useState<RecentBrief[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBriefs(readBriefs());
  }, []);

  if (!mounted || briefs.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
        Your recent briefs
      </p>
      <ul className="space-y-1">
        {briefs.map((b) => (
          <li key={b.id}>
            <Link
              href={`/results/${b.id}`}
              className="group flex items-baseline justify-between border-b hairline py-2 text-sm hover:bg-neutral-50"
            >
              <span className="font-medium group-hover:underline">{b.title}</span>
              <span className="text-xs text-neutral-500">
                {new Date(b.createdAt).toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
