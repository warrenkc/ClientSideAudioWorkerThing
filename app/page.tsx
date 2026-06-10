import { AudioWaveform, Sparkles, Zap } from "lucide-react";

import { AudioTool } from "@/components/audio-tool";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-16 sm:py-24">
        <Badge variant="secondary" className="mb-6 gap-1.5">
          <Zap className="h-3 w-3" />
          Runs entirely in your browser
        </Badge>

        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <AudioWaveform className="h-7 w-7 text-primary" />
          </div>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Make quiet, rough speech{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-primary bg-clip-text text-transparent">
              loud and clear
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">
            Drop in a voice recording and VocalClear automatically normalizes
            the loudness, evens out the dynamics, and tames distortion — so
            it&apos;s easy to understand at normal volume in the car. All
            processing happens on your device with WebAssembly.
          </p>
        </div>

        <AudioTool />

        <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <Feature
            icon={<Sparkles className="h-4 w-4" />}
            title="Fully automatic"
            body="No knobs to tweak. It reads your levels and optimizes for vocals."
          />
          <Feature
            icon={<Zap className="h-4 w-4" />}
            title="WebAssembly engine"
            body="FFmpeg's broadcast-grade loudness normalization, in the browser."
          />
          <Feature
            icon={<AudioWaveform className="h-4 w-4" />}
            title="Private by design"
            body="Files are processed locally and never uploaded anywhere."
          />
        </div>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-card/50 p-5">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
