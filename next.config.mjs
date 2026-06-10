/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // FFmpeg.wasm (single-threaded core) loads its WASM + worker from blob URLs,
  // so no SharedArrayBuffer / COOP-COEP headers are required. Everything runs
  // entirely in the browser — no audio ever leaves the device.
  webpack: (config) => {
    // Some @ffmpeg transitive deps reference node builtins that don't exist in
    // the browser bundle; stub them out so the client build stays clean.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
