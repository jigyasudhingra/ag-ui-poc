export default function Page() {
  return (
    <p className="max-w-prose text-sm leading-relaxed text-zinc-400">
      Tool results render inline when the model calls <code className="text-zinc-200">data_formatter</code>,{' '}
      <code className="text-zinc-200">calculator</code>, or{' '}
      <code className="text-zinc-200">unit_converter</code>.
    </p>
  );
}
