/**
 * API routing:
 * - Dev (Vite): same-origin `/api` and `/ws` via proxy → no CORS / private-network blocks
 * - Prod: set VITE_API_URL or fall back to http://127.0.0.1:8000
 */
const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
export const API_BASE = configured || (import.meta.env.DEV ? "" : "http://127.0.0.1:8000");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const apiPath = p.startsWith("/api") ? p : `/api${p}`;
  return API_BASE ? `${API_BASE}${apiPath}` : apiPath;
}

function wsBase(): string {
  if (API_BASE) {
    return API_BASE.replace(/^http/i, "ws");
  }
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
}

export const WS_URL = `${wsBase()}/ws/live`;

export function apiDisplayLabel(): string {
  if (API_BASE) return API_BASE;
  return `${location.origin}/api → 127.0.0.1:8000`;
}

export function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init.signal
    ? (() => {
        const outer = init.signal!;
        outer.addEventListener("abort", () => controller.abort(), { once: true });
        return controller.signal;
      })()
    : controller.signal;
  return fetch(url, { ...init, signal }).finally(() => clearTimeout(timer));
}

export function fetchErrorMessage(err: unknown): string {
  if (err instanceof TypeError && /fetch|network|failed/i.test(err.message)) {
    return `Cannot reach backend. Run: cd neuro-project && npm start (then open http://localhost:5173)`;
  }
  if (err instanceof Error && err.name === "AbortError") {
    return "Request timed out — is the backend still starting? Wait a few seconds and retry.";
  }
  return err instanceof Error ? err.message : "Request failed";
}
