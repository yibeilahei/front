import type { NextConfig } from "next";

// Custom domain (lazahata.com) is served at the site root. Do not infer
// `/${repo}` from GITHUB_REPOSITORY — that only applies to project Pages
// without a custom domain.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
