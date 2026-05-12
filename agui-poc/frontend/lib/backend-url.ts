/** Backend base URL for CopilotKit runtime (server). */
export function getBackendBase(): string {
  return (
    process.env.AG_UI_BACKEND_URL ??
    process.env.NEXT_PUBLIC_AG_UI_BACKEND_URL ??
    'http://127.0.0.1:8000'
  );
}
