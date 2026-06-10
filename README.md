# VocalClear

Clean up spoken-word audio **entirely in the browser**. Drop in a quiet,
distorted, or uneven voice recording and VocalClear automatically normalizes
the loudness, evens out the dynamics, and tames clipping — so it's easy to
understand at normal volume (e.g. listening in the car). No files are ever
uploaded; all processing is client-side.

## How it works

- **Primary engine — FFmpeg.wasm (WebAssembly).** Runs a vocal-tuned filter
  chain in the browser:
  - `highpass` to strip low rumble
  - `acompressor` to even out level swings for intelligibility
  - `loudnorm` (EBU R128) to normalize to a loud, consistent target (-14 LUFS)
  - `alimiter` to catch peaks and existing distortion without hard clipping

  Output: 192 kbps MP3, universally car-stereo compatible.

- **Fallback engine — native Web Audio API.** If WebAssembly can't load, the
  app renders offline through a `BiquadFilter` → `DynamicsCompressor` → gain
  graph, peak-normalizes the result, and exports WAV. The switch is automatic.

It's fully automatic — no controls. The app analyzes the input levels and
optimizes for vocals, then shows you a before/after comparison and A/B preview.

## Stack

- **Next.js (App Router) + React + TypeScript**
- **Tailwind CSS** with shadcn/ui-style primitives — so any component from
  [21st.dev](https://21st.dev) drops straight in.
- `components.json` is configured, so `npx shadcn@latest add <component>` works
  out of the box.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy to GitHub Pages

This repo includes a workflow at `.github/workflows/deploy.yml` that builds and
deploys the app to GitHub Pages whenever you push to `main`.

One-time repo setup in GitHub:

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

After that, each push to `main` will publish the latest version.

## Notes

- The FFmpeg WASM core (~25 MB) is fetched from a CDN on first use and cached.
  It loads lazily (prefetched when you hover the upload button).
- Single-threaded core is used, so no `SharedArrayBuffer` / COOP-COEP headers
  are required.
- Adding a 21st.dev component:
  ```bash
  npx shadcn@latest add "https://21st.dev/r/<author>/<component>"
  ```

## License

MIT
