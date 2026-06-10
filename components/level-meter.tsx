"use client";

import { cn } from "@/lib/utils";

interface LevelMeterProps {
  label: string;
  /** Level in dBFS, typically -60..0. */
  db: number;
  className?: string;
}

// Map a dBFS value (-60..0) to a 0..100 fill percentage.
function dbToPercent(db: number): number {
  const clamped = Math.max(-60, Math.min(0, db));
  return ((clamped + 60) / 60) * 100;
}

export function LevelMeter({ label, db, className }: LevelMeterProps) {
  const pct = dbToPercent(db);
  const display = db <= -99 ? "−∞" : `${db.toFixed(1)}`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">
          {display} dB
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {/* -1 dBFS reference marker */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${dbToPercent(-1)}%` }}
        />
      </div>
    </div>
  );
}
