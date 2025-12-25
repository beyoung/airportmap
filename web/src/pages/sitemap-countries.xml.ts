import type { APIRoute } from "astro";
import { AirportDatabase } from "../lib/database";

export const GET: APIRoute = async () => {
  try {
    const airportDb = new AirportDatabase();

    // Get country stats for country pages
    const countryStats = await airportDb.getCountryStats();

    const baseUrl = "https://airport.ayamap.com";
    const currentDate = new Date().toISOString().split("T")[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add countries index page
    sitemap += `	<url>
		<loc>${baseUrl}/countries</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>
`;

    // Add individual country pages
    for (const country of countryStats) {
      if (country.country) {
        sitemap += `	<url>
		<loc>${baseUrl}/countries/${country.country.toLowerCase()}</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>monthly</changefreq>
		<priority>0.7</priority>
	</url>
`;
      }
    }

    sitemap += `</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error generating countries sitemap:", error);
    return new Response("Error generating countries sitemap", { status: 500 });
  }
};
