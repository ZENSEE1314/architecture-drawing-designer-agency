import SubmissionForm from "@/components/SubmissionForm";

export default function SubmitPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">New brief</p>
        <h1 className="mt-2 font-display text-4xl">Tell us about your project</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          We will return three distinct concept directions within 48 hours of approval.
          The more specific your level-by-level business intent, the stronger the proposals.
        </p>
      </header>
      <SubmissionForm />
    </div>
  );
}
