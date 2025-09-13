import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
	try {
		const url = new URL(request.url);
		const wikipediaUrl = url.searchParams.get('url');
		
		if (!wikipediaUrl) {
			return new Response(
				JSON.stringify({ error: 'Wikipedia URL is required' }),
				{ 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Extract page title from Wikipedia URL
		const match = wikipediaUrl.match(/\/wiki\/([^#?]+)/);
		if (!match) {
			return new Response(
				JSON.stringify({ error: 'Invalid Wikipedia URL format' }),
				{ 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const pageTitle = decodeURIComponent(match[1]);
		
		// Determine language from URL
		const langMatch = wikipediaUrl.match(/\/\/(\w+)\.wikipedia\.org/);
		const language = langMatch ? langMatch[1] : 'en';
		
		// Call Wikipedia API to get page extract
		const apiUrl = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
		
		const response = await fetch(apiUrl, {
			headers: {
				'User-Agent': 'AyaMap-Airports/1.0 (https://ayamap-airports.pages.dev)'
			}
		});
		
		if (!response.ok) {
			if (response.status === 404) {
				return new Response(
					JSON.stringify({ error: 'Wikipedia page not found' }),
					{ 
						status: 404,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}
			throw new Error(`Wikipedia API error: ${response.status}`);
		}
		
		const data = await response.json();
		
		// Extract relevant information
		const result = {
			title: data.title || pageTitle,
			extract: data.extract || '',
			thumbnail: data.thumbnail?.source || null,
			url: data.content_urls?.desktop?.page || wikipediaUrl,
			language: language
		};
		
		return new Response(
			JSON.stringify(result),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
				}
			}
		);
		
	} catch (error) {
		console.error('Wikipedia API error:', error);
		
		return new Response(
			JSON.stringify({ 
				error: 'Failed to fetch Wikipedia data',
				message: error instanceof Error ? error.message : 'Unknown error'
			}),
			{ 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};