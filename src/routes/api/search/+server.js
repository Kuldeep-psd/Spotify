import { json } from '@sveltejs/kit';
import { searchCatalogue } from '$lib/server/catalogue.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
    return json(searchCatalogue(url.searchParams.get('q')), {
        headers: { 'X-Search-Source': 'local' }
    });
}
