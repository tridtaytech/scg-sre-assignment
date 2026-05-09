"use client";

import type { BackendStamp, FrontendStamp } from "../lib/types";

function tone(color: string | null | undefined) {
  if (color === "blue") return "bg-rolloutBlue text-white";
  if (color === "green") return "bg-rolloutGreen text-white";
  return "bg-gray-200 text-gray-700";
}

function Card({
  title,
  version,
  pod,
  color,
}: {
  title: string;
  version: string | null;
  pod: string | null;
  color: string | null;
}) {
  return (
    <div className={`rounded-md px-4 py-3 text-sm font-mono ${tone(color)}`}>
      <div className="text-xs uppercase tracking-wider opacity-60">{title}</div>
      <div><span className="opacity-70">version</span> {version ?? "unknown"}</div>
      <div><span className="opacity-70">pod</span> {pod ?? "unknown"}</div>
      <div><span className="opacity-70">color</span> {color ?? "none"}</div>
    </div>
  );
}

export function VersionBanner({
  backend,
  frontend,
}: {
  backend: BackendStamp | null;
  frontend: FrontendStamp | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card title="frontend" version={frontend?.version ?? null} pod={frontend?.pod ?? null} color={frontend?.color ?? null} />
      <Card title="backend"  version={backend?.appVersion ?? null} pod={backend?.podName ?? null} color={backend?.rolloutColor ?? null} />
    </div>
  );
}
