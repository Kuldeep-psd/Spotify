import assert from "node:assert/strict";
import test from "node:test";
import {
    createPosterGeometry,
    formatArtists,
    normalizePosterTrack,
    posterFilename,
    wrapPosterText,
} from "../src/lib/poster.js";

test("missing, malformed and out-of-range audio features remain drawable", () => {
    const normalized = normalizePosterTrack({
        energy: "0.4", danceability: 20, valence: -2,
        loudness: -100, tempo: "not a number", acousticness: Infinity,
    });
    assert.deepEqual(normalized, {
        track_name: "Untitled track", artists: "Unknown artist",
        energy: 0.4, danceability: 1, valence: 0,
        loudness: -60, tempo: 125, acousticness: 0.1,
    });
    for (const value of [undefined, null, {}, false]) {
        const geometry = createPosterGeometry(value);
        assert.ok(geometry.layers.length > 0);
        for (const layer of geometry.layers) {
            assert.ok([layer.x, layer.y, layer.width, layer.height].every(Number.isFinite));
            assert.ok(layer.width > 0 && layer.height > 0);
        }
    }
    assert.equal(normalizePosterTrack({ energy: null, valence: "" }).energy, 0.75);
});

test("a zero-tempo track still has a layer and preserves valid zero features", () => {
    const geometry = createPosterGeometry({ tempo: 0, energy: 0, valence: 0, danceability: 0, acousticness: 0, loudness: 0 });
    assert.equal(geometry.layers.length, 1);
    assert.equal(geometry.features.valence, 0);
    assert.equal(geometry.origin.size, 100);
    assert.equal(geometry.origin.x, 250);
    assert.equal(geometry.origin.y, 250);
});

test("artist labels handle missing values, delimiters and arrays", () => {
    assert.equal(formatArtists(undefined), "Unknown artist");
    assert.equal(formatArtists("First; Second;; Third"), "First, Second, Third");
    assert.equal(formatArtists(["First", { name: "Second" }, null]), "First, Second");
});

test("regenerating a layered composition uses new colors without changing feature geometry", () => {
    const first = createPosterGeometry({ tempo: 125 }, () => 0.1);
    const next = createPosterGeometry({ tempo: 125 }, () => 0.9);
    assert.notEqual(first.layers[1].color, next.layers[1].color);
    assert.equal(first.layers[1].width, next.layers[1].width);
});

test("long text and unicode stay within the poster's line budget", () => {
    const measure = (text) => Array.from(text).length * 10;
    const result = wrapPosterText("a long title with emoji 🎵 and lots of additional words", measure, 100, 2);
    assert.equal(result.length, 2);
    assert.ok(result.every((line) => measure(line) <= 100));
    assert.ok(result[1].endsWith("…"));
    assert.deepEqual(wrapPosterText("🎵🎵🎵", measure, 20, 2), ["🎵🎵", "🎵"]);
    assert.deepEqual(wrapPosterText("short title", measure, 200), ["short title"]);
    assert.deepEqual(wrapPosterText("Beach House", measure, 70), ["Beach", "House"]);
});

test("download filenames retain titles and remove path separators", () => {
    assert.equal(posterFilename("Song / Artist: Remix.png"), "Song - Artist- Remix.png");
    assert.equal(posterFilename("..."), "music-poster.png");
    assert.equal(posterFilename("🎵 song"), "🎵 song.png");
});
