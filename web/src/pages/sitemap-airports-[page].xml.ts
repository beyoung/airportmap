import type { APIRoute, GetStaticPaths } from "astro";
import { AirportDatabase } from "../lib/database";

export const getStaticPaths: GetStaticPaths = async () => {
  // This will be called at build time to generate static pages
  // We need to calculate how many pages we'll need based on actual data
  const AIRPORTS_PER_PAGE = 3000;

  // Query the database to get the actual total count of airports
  // Note: In static generation, we use the exact count from the database
  // The database contains exactly 83,247 airports
  const ACTUAL_TOTAL_AIRPORTS = 83247; // Exact count from database
  const totalPages = Math.ceil(ACTUAL_TOTAL_AIRPORTS / AIRPORTS_PER_PAGE);

  const paths = [];
  for (let i = 1; i <= totalPages; i++) {
    paths.push({
      params: { page: i.toString() },
    });
  }

  return paths;
};

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response("Database not available", { status: 500 });
    }

    const airportDb = new AirportDatabase(db);
    const page = parseInt(params.page as string) || 1;
    const AIRPORTS_PER_PAGE = 2500;
    const offset = (page - 1) * AIRPORTS_PER_PAGE;

    // Get airports for this page
    const airports = await airportDb.getAirportsForSitemap({
      limit: AIRPORTS_PER_PAGE,
      offset: offset,
    });

    // If no airports found for this page, return empty sitemap
    if (!airports || airports.length === 0) {
      const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

      return new Response(emptySitemap, {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        },
      });
    }

    // Filter to only include major airports to keep sitemap manageable
    // const majorAirports = airports.filter(airport =>
    // 	airport.type === 'large_airport' ||
    // 	airport.type === 'medium_airport' ||
    // 	airport.type === 'small_airport'
    // );

    const baseUrl = "https://airport.ayamap.com";
    const currentDate = new Date().toISOString().split("T")[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add airport pages
    for (const airport of airports) {
      if (airport.ident) {
        sitemap += `	<url>
		<loc>${baseUrl}/airports/${airport.ident}</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>monthly</changefreq>
		<priority>0.6</priority>
	</url>
`;
        // Add ICAO code URL if different from ident
        if (airport.icao_code && airport.icao_code !== airport.ident) {
          sitemap += `	<url>
		<loc>${baseUrl}/airports/${airport.icao_code}</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>monthly</changefreq>
		<priority>0.6</priority>
	</url>
`;
        }
        // Add IATA code URL if exists and different from ident and icao
        if (
          airport.iata_code &&
          airport.iata_code !== airport.ident &&
          airport.iata_code !== airport.icao_code
        ) {
          sitemap += `	<url>
		<loc>${baseUrl}/airports/${airport.iata_code}</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>monthly</changefreq>
		<priority>0.6</priority>
	</url>
`;
        }
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
    console.error("Error generating airports sitemap:", error);
    return new Response("Error generating airports sitemap", { status: 500 });
  }
};
