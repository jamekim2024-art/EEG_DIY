export type LivePayload = {
  timestamp?: number;
  bands?: Record<string, { absolute: number; relative: number }>;
  baselineChange?: Record<string, number>;
  prediction?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  artifact?: { detected: boolean; type: string };
  signalQuality?: number;
  psd?: { freqs: number[]; values: number[] };
  waveform?: { raw: number[]; filtered: number[]; time_s?: number[]; sample_rate?: number };
  status?: Record<string, unknown>;
};

export type SystemStatus = {
  esp32_connected: boolean;
  ads1015_detected: boolean;
  fallback_mode?: boolean;
  sample_rate_hz: number;
  lead_status: string;
  buzzer_active?: boolean;
  led_active?: boolean;
  demo_mode: boolean;
  simulation_mode: boolean;
  recording: boolean;
};
