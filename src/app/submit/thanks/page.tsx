import Link from "next/link";

type SP = { searchParams: Promise<{ id?: string }> };

export default async function ThanksPage({ searchParams }: SP) {
  const { id } = await searchParams;
  return (
    <div className="mx-auto max-w-xl space-y-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Received</p>
      <h1 className="font-display text-4xl">Brief submitted</h1>
      <p className="text-neutral-600">
        Our studio will review and return three concept directions. You will be notified
        by email.
      </p>
      {id && (
        <p className="text-xs text-neutral-500">
          Reference: <code>{id}</code>
        </p>
      )}
      <Link
        href="/"
        className="inline-block rounded-full border hairline px-5 py-2 text-sm hover:bg-neutral-100"
      >
        Back to home
      </Link>
    </div>
  );
}
