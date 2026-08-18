export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  showDays: boolean;
};

export function remainingCountdownParts(milliseconds: number): CountdownParts {
  const clamped = Math.max(0, Math.floor(milliseconds));
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
    showDays: clamped >= 86_400_000,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatCountdownClock(milliseconds: number): string {
  const parts = remainingCountdownParts(milliseconds);
  const hms = `${pad2(parts.hours)} : ${pad2(parts.minutes)} : ${pad2(parts.seconds)}`;
  if (parts.showDays) {
    return `${pad2(parts.days)} : ${hms}`;
  }
  return hms;
}

export function remainingMsFromServerClock(params: {
  expiresAt: string;
  serverNow: string;
  clientNowMs?: number;
  offsetCapturedAtMs?: number;
}): number {
  const clientNowMs = params.clientNowMs ?? Date.now();
  const capturedAt = params.offsetCapturedAtMs ?? clientNowMs;
  const serverOffset = Date.parse(params.serverNow) - capturedAt;
  const expiry = Date.parse(params.expiresAt);
  if (!Number.isFinite(serverOffset) || !Number.isFinite(expiry)) return 0;
  return expiry - (clientNowMs + serverOffset);
}
