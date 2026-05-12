export default function Page() {
  return (
    <p className="max-w-prose text-sm leading-relaxed text-zinc-400">
      The model generates UUIDs on the server, then invokes the frontend{' '}
      <code className="text-zinc-200">save_generated_data</code> human-in-the-loop tool so you can
      approve or cancel before it confirms.
    </p>
  );
}
