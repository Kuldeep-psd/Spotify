import assert from 'node:assert/strict';
import test from 'node:test';
import { createSearchIndex, MAX_QUERY_LENGTH, searchTracks } from '../src/lib/server/search.js';

const index = createSearchIndex([
    { track_id: 'live', track_name: 'Halo (Live)', artists: 'Beyoncé' },
    { track_id: 'halo', track_name: 'Halo', artists: 'Beyoncé' },
    { track_id: 'halo', track_name: 'Halo', artists: 'Beyoncé' },
    { track_id: 'halo-reissue', track_name: 'HALO', artists: 'Beyonce' },
    { track_id: 'acdc', track_name: 'Rock & Roll', artists: 'AC/DC' },
    { track_id: 'number', track_name: 1999, artists: 1975 },
    { track_id: 'unknown', track_name: 'Unknown Song', artists: null },
    { track_id: 'invalid', track_name: null, artists: 'Artist' },
    null
]);

test('matches titles, artists, accents, case, and combined terms', () => {
    assert.deepEqual(searchTracks(index, '  HALO ').map(t => t.track_id), ['halo', 'live']);
    assert.equal(searchTracks(index, 'beyonce').length, 2);
    assert.equal(searchTracks(index, 'halo BEYONCÉ').length, 2);
    assert.equal(searchTracks(index, 'halo unrelated').length, 0);
});

test('URL-decoded punctuation is literal text rather than a wildcard or expression', () => {
    const query = new URL('http://localhost/api/search?q=Rock%20%26%20Roll').searchParams.get('q');
    assert.equal(searchTracks(index, query)[0].track_id, 'acdc');
    assert.equal(searchTracks(index, 'AC/DC')[0].track_id, 'acdc');
    assert.deepEqual(searchTracks(index, '%_*'), []);
    assert.deepEqual(searchTracks(index, '.*'), []);
});

test('deduplicates IDs and repeated recordings while retaining separately named versions', () => {
    assert.equal(index.length, 5);
    assert.deepEqual(searchTracks(index, 'halo').map(t => t.track_id), ['halo', 'live']);
});

test('normalizes non-string catalogue values', () => {
    assert.equal(searchTracks(index, '1999')[0].track_name, '1999');
    assert.equal(searchTracks(index, '1975')[0].artists, '1975');
    assert.equal(searchTracks(index, 'Unknown Song')[0].artists, 'Unknown artist');
});

test('returns empty results for empty, invalid, or overlong queries', () => {
    for (const query of ['', '   ', null, undefined, {}, 'a'.repeat(MAX_QUERY_LENGTH + 1)]) {
        assert.deepEqual(searchTracks(index, query), []);
    }
});

test('limits results and ranks an exact title ahead of earlier partial matches', () => {
    const manyTracks = Array.from({ length: 25 }, (_, i) => ({
        track_id: String(i), track_name: `Love Song ${i}`, artists: 'Artist'
    }));
    manyTracks.push({ track_id: 'exact', track_name: 'Love', artists: 'Artist' });
    const results = searchTracks(createSearchIndex(manyTracks), 'love');
    assert.equal(results.length, 10);
    assert.equal(results[0].track_id, 'exact');
    assert.equal(new Set(results.map(t => t.track_id)).size, 10);
});
