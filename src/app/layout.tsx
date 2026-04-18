import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier — Architecture Drawing Agency",
  description: "Upload a floor plan. Get three concept-stage architectural proposals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b hairline">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-display text-2xl tracking-tight">Atelier</span>
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Architecture Agency
              </span>
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/submit" className="hover:underline">
                Start a brief
              </Link>
              <Link href="/admin" className="hover:underline">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mt-20 border-t hairline">
          <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-neutral-500">
            Concept-stage only. Not for construction.
          </div>
        </footer>
      </body>
    </html>
  );
}
