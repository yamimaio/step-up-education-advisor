import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Files read with fs at runtime are not traced into the standalone output on their own.
  // Step 6 reads the advisor prompt in /api/chat; list any other runtime-read files here.
  outputFileTracingIncludes: { "/api/chat": ["./core/advisor/**/*.md"] },
};

export default nextConfig;
