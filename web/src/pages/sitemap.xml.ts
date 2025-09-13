import type { APIRoute } from 'astro';
import { AirportDatabase } from '../lib/database';

export const GET: APIRoute = async ({ locals }) => {
	try {
		const db = (locals as any).runtime?.env?.DB;
		if (!db) {
			return new Response('Database not available', { status: 500 });
		}

		const airportDb = new AirportDatabase(db);
		
		// Get all airports for sitemap
		const airports = await airportDb.getAirportsInBounds({
			north: 90,
			south: -90,
			east: 180,
			west: -180,
			limit: 50000
		});
		
		// Get country stats for country pages
		const countryStats = await airportDb.getCountryStats();
		
		const baseUrl = 'https://ayamap-airports.pages.dev';
		const currentDate = new Date().toISOString().split('T')[0];
		
		let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
		
		// Add main pages
		sitemap += `	<url>
		<loc>${baseUrl}/</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>1.0</priority>
	</url>
`;
		
		sitemap += `	<url>
		<loc>${baseUrl}/countries</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>
`;
		
		// Add country pages
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
		
		// Add airport pages (limit to major airports to avoid huge sitemap)
		const majorAirports = airports.filter(airport => 
			airport.type === 'large_airport' || airport.type === 'medium_airport'
		).slice(0, 10000); // Limit to 10k airports
		
		for (const airport of majorAirports) {
			if (airport.ident) {
				sitemap += `	<url>
		<loc>${baseUrl}/airports/${airport.ident}</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>monthly</changefreq>
		<priority>0.6</priority>
	</url>
`;
			}
		}
		
		sitemap += `</urlset>`;
		
		return new Response(sitemap, {
			headers: {
				'Content-Type': 'application/xml',
				'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
			}
		});
		
	} catch (error) {
		console.error('Error generating sitemap:', error);
		return new Response('Error generating sitemap', { status: 500 });
	}
};