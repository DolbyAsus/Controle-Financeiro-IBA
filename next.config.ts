import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // O app não recebe arquivos. Um teto pequeno reduz a superfície de abuso
      // das Server Actions sem impactar os formulários financeiros.
      bodySizeLimit: "512kb",
    },
  },
};

export default nextConfig;
