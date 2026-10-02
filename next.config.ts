import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old city-page URL format (still in Google's index) → current route.
      { source: "/rent-management-software-:city", destination: "/rent-management-software/:city", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/refund-policy", destination: "/refund", permanent: true },
    ];
  },
};

export default nextConfig;
