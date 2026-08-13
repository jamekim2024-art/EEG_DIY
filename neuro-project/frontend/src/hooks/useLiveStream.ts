import { useCallback, useEffect, useRef, useState } from "react";
import type { LivePayload, SystemStatus } from "../types";
import { API_BASE, WS_URL, apiUrl, fetchErrorMessage } from "./apiClient";

export function useLiveStream() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [data, setData] = useState<LivePayload>({});
  const [connected, setConnected] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/status"), { signal: AbortSignal.timeout(3000) });
      setBackendOnline(res.ok);
      return res.ok;
    } catch {
      setBackendOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkBackend();
    const t = setInterval(checkBackend, 8000);
    return () => clearInterval(t);
  }, [checkBackend]);

  useEffect(() => {
    let alive = true;
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => alive && setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 2000);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.status) setStatus(msg.status);
          if (msg.data) setData(msg.data);
        } catch {
          /* ignore */
        }
      };
    };
    connect();
    return () => {
      alive = false;
      wsRef.current?.close();
    };
  }, []);

  const hasSignal = Boolean(data.waveform?.raw?.length || data.waveform?.filtered?.length);

  return { status, data, wsConnected: connected, hasSignal, backendOnline, checkBackend, apiBase: API_BASE };
}

export async function apiPost(path: string, body?: unknown, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(path.startsWith("/") ? path : `/${path}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        if (!res.ok) {
          throw new Error(text.slice(0, 200) || res.statusText);
        }
      }
    }
    if (!res.ok) {
      const detail = json.detail as string | { msg?: string }[] | undefined;
      let message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg ?? JSON.stringify(d)).join("; ")
            : res.statusText;
      if (res.status === 404 && (message === "Not Found" || !message)) {
        message = `API not found — restart backend: npm start (${API_BASE})`;
      }
      if (res.status >= 500 && message === "Internal Server Error") {
        message = (typeof json.detail === "string" && json.detail) || message;
      }
      throw new Error(message || "Request failed");
    }
    return json;
  } catch (e) {
    throw new Error(fetchErrorMessage(e));
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGet(path: string) {
  try {
    const res = await fetch(apiUrl(path.startsWith("/") ? path : `/${path}`));
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  } catch (e) {
    throw new Error(fetchErrorMessage(e));
  }
}
