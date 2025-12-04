import type { APIRoute } from "astro";
const AirportCount = 83247;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response("Database not available", { status: 500 });
    }

    const AIRPORTS_PER_PAGE = 3000;
    const totalAirportPages = Math.ceil(AirportCount / AIRPORTS_PER_PAGE);

    const baseUrl = "https://airport.ayamap.com";
    const currentDate = new Date().toISOString().split("T")[0];

    // Use sitemap index format for better organization
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add main pages sitemap
    sitemap += `	<sitemap>
		<loc>${baseUrl}/sitemap-main.xml</loc>
		<lastmod>${currentDate}</lastmod>
	</sitemap>
`;

    // Add countries sitemap
    sitemap += `	<sitemap>
		<loc>${baseUrl}/sitemap-countries.xml</loc>
		<lastmod>${currentDate}</lastmod>
	</sitemap>
`;

    // Add blog sitemap
    sitemap += `	<sitemap>
		<loc>${baseUrl}/sitemap-blog.xml</loc>
		<lastmod>${currentDate}</lastmod>
	</sitemap>
`;

    // Add airport sitemaps (one for each page)
    for (let i = 1; i <= totalAirportPages; i++) {
      sitemap += `	<sitemap>
		<loc>${baseUrl}/sitemap-airports-${i}.xml</loc>
		<lastmod>${currentDate}</lastmod>
	</sitemap>
`;
    }

    sitemap += `</sitemapindex>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error generating sitemap index:", error);
    return new Response("Error generating sitemap index", { status: 500 });
  }
};
