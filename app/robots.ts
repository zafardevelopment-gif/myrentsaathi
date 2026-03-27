import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/superadmin/",
          "/admin/",
          "/landlord/",
          "/tenant/",
          "/board/",
          "/signup/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.myrentsaathi.com/sitemap.xml",
  };
}
