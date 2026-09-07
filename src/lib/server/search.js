export const MAX_QUERY_LENGTH = 120;
export const MAX_RESULTS = 10;

function textValue(value) {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
}

export function normalizeSearchText(value) {
    return textValue(value)
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

// Keep the catalogue and its precomputed strings on the server. Some catalogue
// titles and artist names are numbers, so normalize those before sending to UI.
export function createSearchIndex(tracks) {
    const seenIds = new Set();
    const seenRecordings = new Set();
    const index = [];

    for (const source of tracks) {
        if (!source || typeof source !== 'object') continue;
        const id = textValue(source.track_id);
        const title = textValue(source.track_name);
        if (!id || !title || seenIds.has(id)) continue;

        const artists = textValue(source.artists) || 'Unknown artist';
        const normalizedTitle = normalizeSearchText(title);
        const normalizedArtists = normalizeSearchText(artists);
        const recordingKey = JSON.stringify([normalizedTitle, normalizedArtists]);
        if (seenRecordings.has(recordingKey)) continue;
        seenIds.add(id);
        seenRecordings.add(recordingKey);
        index.push({
            track: { ...source, track_id: id, track_name: title, artists },
            title: normalizedTitle,
            artists: normalizedArtists,
            searchable: `${normalizedTitle} ${normalizedArtists}`
        });
    }

    return index;
}

export function searchTracks(index, input) {
    if (typeof input !== 'string' || input.length > MAX_QUERY_LENGTH) return [];
    const query = normalizeSearchText(input);
    if (!query) return [];
    const terms = query.split(' ');
    const matches = [];

    for (const entry of index) {
        if (!terms.every((term) => entry.searchable.includes(term))) continue;

        const rank = entry.title === query ? 0
            : entry.artists === query ? 1
            : entry.title.startsWith(query) ? 2
            : entry.artists.startsWith(query) ? 3
            : entry.title.includes(query) ? 4
            : entry.artists.includes(query) ? 5 : 6;
        matches.push({ rank, track: entry.track });
    }

    // Stable sorting retains catalogue order for equally relevant matches.
    return matches.sort((a, b) => a.rank - b.rank)
        .slice(0, MAX_RESULTS)
        .map(({ track }) => track);
}
