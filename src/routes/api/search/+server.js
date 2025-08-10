import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Create a Supabase client directly inside the endpoint
const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const query = url.searchParams.get('q');

    if (!query) {
        return json([]);
    }

    // Use Supabase's `ilike` for a case-insensitive "contains" search
    const { data, error } = await supabase
        .from('audio_features')
        .select('*')
        .ilike('track_name', `%${query}%`) // Search the correct column
        .limit(10);

    if (error) {
        // Log the detailed error to your terminal
        console.error('Supabase search error:', error);
        // Return a generic error to the client
        return json({ message: 'Error searching for tracks' }, { status: 500 });
    }

    return json(data ?? []);
}