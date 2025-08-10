
import { supabase } from '$lib/supabaseClient';

export async function load() {
    const { data, error } = await supabase
        .from('audio_features')
        .select('*');

    if (error) {
        console.error("Error fetching tracks from Supabase:", error);
        return { tracks: [] };
    }

    return {
        tracks: data ?? []
    };
}