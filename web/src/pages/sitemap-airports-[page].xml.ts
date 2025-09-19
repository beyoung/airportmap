import type { APIRoute, GetStaticPaths } from 'astro';
import { AirportDatabase } from '../lib/database';

export const getStaticPaths: GetStaticPaths = async () => {
	// This will be called at build time to generate static pages
	// We need to calculate how many pages we'll need
	const AIRPORTS_PER_PAGE = 8000;
	
	// For static generation, we'll estimate the number of pages
	// In a real scenario, you might want to query the database here
	// For now, let's assume we have around 80,000 airports
	const ESTIMATED_TOTAL_AIRPORTS = 80000;
	const totalPages = Math.ceil(ESTIMATED_TOTAL_AIRPORTS / AIRPORTS_PER_PAGE);
	
	const paths = [];
	for (let i = 1; i <= totalPages; i++) {
		paths.push({
			params: { page: i.toString() }
		});
	}
	
	return paths;
};

export const GET: APIRoute = async ({ locals, params }) => {
	try {
		const db = (locals as any).runtime?.env?.DB;
		if (!db) {
			return new Response('Database not available', { status: 500 });
		}

		const airportDb = new AirportDatabase(db);
		const page = parseInt(params.page as string) || 1;
		const AIRPORTS_PER_PAGE = 8000;
		const offset = (page - 1) * AIRPORTS_PER_PAGE;
		
		// Get airports for this page
		const airports = await airportDb.getAirportsInBounds({
			north: 90,
			south: -90,
			east: 180,
			west: -180,
			limit: AIRPORTS_PER_PAGE,
			offset: offset
		});
		
		// Filter to only include major airports to keep sitemap manageable
		const majorAirports = airports.filter(airport => 
			airport.type === 'large_airport' || 
			airport.type === 'medium_airport' ||
			airport.type === 'small_airport'
		);
		
		const baseUrl = 'https://airport.ayamap.com';
		const currentDate = new Date().toISOString().split('T')[0];
		
		let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
		
		// Add airport pages
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
		console.error('Error generating airports sitemap:', error);
		return new Response('Error generating airports sitemap', { status: 500 });
	}
};