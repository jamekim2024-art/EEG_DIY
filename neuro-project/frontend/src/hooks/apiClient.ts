/** Backend base URL — always talk directly to FastAPI (CORS enabled). */
export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p.startsWith("/api") ? p : `/api${p}`}`;
}

export const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${new URL(API_BASE).host}/ws/live`;

export function fetchErrorMessage(err: unknown): string {
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return `Cannot reach backend at ${API_BASE}. Run: cd neuro-project && npm start`;
  }
  if (err instanceof Error && err.name === "AbortError") {
    return "Request timed out — try again.";
  }
  return err instanceof Error ? err.message : "Request failed";
}
