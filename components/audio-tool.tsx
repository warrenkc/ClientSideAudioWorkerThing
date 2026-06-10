"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioWaveform,
  CheckCircle2,
  Cpu,
  Download,
  FileAudio,
  Loader2,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LevelMeter } from "@/components/level-meter";
import { preloadFFmpeg } from "@/lib/ffmpeg-processor";
import { processFile, type ProcessOutcome } from "@/lib/processor";

type Status = "idle" | "processing" | "done" | "error";

const ACCEPTED = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus,.webm";

function formatDuration(sec: number): string {
  if (!isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioTool() {
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [outcome, setOutcome] = useState<ProcessOutcome | null>(null);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const outcomeRef = useRef<ProcessOutcome | null>(null);
  const originalUrlRef = useRef<string>("");

  // Keep refs in sync so the unmount cleanup can revoke the latest URLs.
  useEffect(() => {
    outcomeRef.current = outcome;
  }, [outcome]);
  useEffect(() => {
    originalUrlRef.current = originalUrl;
  }, [originalUrl]);
  useEffect(() => {
    return () => {
      if (outcomeRef.current) URL.revokeObjectURL(outcomeRef.current.url);
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    setOutcome((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setOriginalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setStatus("idle");
    setStage("");
    setProgress(0);
    setError("");
    setFileName("");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      // Clear any previous run first.
      setOutcome((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
      setOriginalUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setError("");
      setProgress(0);
      setFileName(file.name);
      setOriginalUrl(URL.createObjectURL(file));
      setStatus("processing");

      try {
        const result = await processFile(file, {
          onStage: setStage,
          onProgress: (r) => setProgress(Math.round(r * 100)),
        });
        setOutcome(result);
        setStatus("done");
        setStage("");
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not process that file. Try a different audio format."
        );
        setStatus("error");
      }
    },
    []
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const download = () => {
    if (!outcome) return;
    const a = document.createElement("a");
    a.href = outcome.url;
    a.download = outcome.outputName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const busy = status === "processing";

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Dropzone */}
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={
          "border-2 border-dashed transition-colors " +
          (dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card/50")
        }
      >
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            {busy ? (
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            ) : (
              <UploadCloud className="h-7 w-7 text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium">
              {busy
                ? "Processing your audio…"
                : "Drop an audio file to clean it up"}
            </p>
            <p className="text-sm text-muted-foreground">
              MP3, WAV, M4A, AAC, OGG, FLAC — it never leaves your device.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={onInputChange}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            onMouseEnter={preloadFFmpeg}
            disabled={busy}
            size="lg"
          >
            <FileAudio className="h-4 w-4" />
            Choose file
          </Button>
        </CardContent>
      </Card>

      {/* Processing progress */}
      {busy && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <AudioWaveform className="h-4 w-4 text-primary" />
                {stage || "Working…"}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {progress > 0 ? `${progress}%` : ""}
              </span>
            </div>
            <Progress value={progress > 0 ? progress : 8} />
            <p className="truncate text-xs text-muted-foreground">{fileName}</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {status === "error" && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 py-5">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Try another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {status === "done" && outcome && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Cleaned up &amp; ready
                </CardTitle>
                <CardDescription className="mt-1 truncate">
                  {fileName}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Cpu className="h-3 w-3" />
                {outcome.engine === "wasm" ? "WebAssembly" : "Native"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Before / after levels */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Before
                </p>
                <LevelMeter label="Loudness" db={outcome.before.lufs} />
                <LevelMeter label="Peak" db={outcome.before.peakDb} />
                <Meta stats={outcome.before} />
              </div>
              <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  After
                </p>
                {outcome.after ? (
                  <>
                    <LevelMeter label="Loudness" db={outcome.after.lufs} />
                    <LevelMeter label="Peak" db={outcome.after.peakDb} />
                    <Meta stats={outcome.after} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Levels normalized and limited for consistent playback.
                  </p>
                )}
              </div>
            </div>

            {/* A/B preview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Original
                </p>
                {originalUrl && (
                  <audio src={originalUrl} controls className="w-full" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-emerald-400">
                  Enhanced
                </p>
                <audio src={outcome.url} controls className="w-full" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={download} size="lg">
                <Download className="h-4 w-4" />
                Download {outcome.extension.toUpperCase()}
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Process another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        100% on-device processing — your audio is never uploaded.
      </p>
    </div>
  );
}

function Meta({ stats }: { stats: { channels: number; sampleRate: number; durationSec: number } }) {
  return (
    <p className="pt-1 text-[11px] text-muted-foreground">
      {stats.channels === 1 ? "Mono" : `${stats.channels}ch`} ·{" "}
      {(stats.sampleRate / 1000).toFixed(1)} kHz · {formatDuration(stats.durationSec)}
    </p>
  );
}
