import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.sparebox.dev",
          },
        ],
        destination: "https://sparebox.dev/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
