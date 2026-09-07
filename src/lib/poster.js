export const POSTER_SIZE = 1500;
const DESIGN_SIZE = 500;

const FEATURE_RANGES = {
    energy: [0, 1, 0.75],
    danceability: [0, 1, 0.8],
    valence: [0, 1, 0.6],
    loudness: [-60, 0, -7],
    tempo: [0, 250, 125],
    acousticness: [0, 1, 0.1],
};

function cleanText(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function formatArtists(artists) {
    const values = Array.isArray(artists)
        ? artists.map((artist) => typeof artist === "string" ? artist : artist?.name)
        : typeof artists === "string" ? artists.split(";") : [];
    return values.map(cleanText).filter(Boolean).join(", ") || "Unknown artist";
}

export function normalizePosterTrack(track = {}) {
    const source = track && typeof track === "object" ? track : {};
    const normalized = {
        track_name: cleanText(source.track_name) || "Untitled track",
        artists: formatArtists(source.artists),
    };
    for (const [feature, [min, max, fallback]] of Object.entries(FEATURE_RANGES)) {
        const value = source[feature];
        const number = typeof value === "number" || (typeof value === "string" && value.trim())
            ? Number(value) : NaN;
        normalized[feature] = Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
    }
    return normalized;
}

export function posterFilename(value) {
    const name = cleanText(value)
        .replace(/\.png$/i, "")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .replace(/^[. ]+|[. ]+$/g, "")
        .slice(0, 120)
        .trim();
    return `${name || "music-poster"}.png`;
}

// Keep the original audio mappings: loudness sets the centre size, energy and
// danceability set its position, acousticness sets width, and tempo adds layers.
export function createPosterGeometry(track, random = Math.random) {
    const features = normalizePosterTrack(track);
    const originSize = 50 + (features.loudness + 60) / 60 * 50;
    const ellipseWidth = 400 - features.acousticness * 200;
    const angle = features.energy * Math.PI * 2;
    const dx = features.danceability * 100 * Math.cos(angle);
    const dy = features.danceability * 100 * Math.sin(angle);
    const count = Math.max(1, Math.ceil(features.tempo / 25));
    const layers = Array.from({ length: count }, (_, index) => ({
        x: 250 + dx / count * index,
        y: 250 + dy / count * index,
        width: ellipseWidth - (ellipseWidth - originSize) / count * index,
        height: 400 - (400 - originSize) / count * index,
        color: hsbToCss(
            (1 - features.valence) * 255 - index * (random() * 200 - 100),
            features.valence * 255,
            features.valence * 255,
        ),
    }));
    return {
        features,
        layers,
        origin: {
            x: 250 + dx,
            y: 250 + dy,
            size: originSize,
            color: hsbToCss(150 + features.valence * 100, 255 - features.valence * 55, 255 * (1 - features.valence)),
        },
    };
}

function hsbToCss(hue, saturation, brightness) {
    const h = ((hue / 255 * 360) % 360 + 360) % 360;
    const s = saturation / 255;
    const v = brightness / 255;
    const lightness = v * (1 - s / 2);
    const hslSaturation = lightness === 0 || lightness === 1
        ? 0 : (v - lightness) / Math.min(lightness, 1 - lightness);
    return `hsl(${h} ${hslSaturation * 100}% ${lightness * 100}%)`;
}

export function wrapPosterText(text, measure, maxWidth, maxLines = 2) {
    const lines = [];
    let remaining = cleanText(text);
    while (remaining && lines.length < maxLines) {
        if (measure(remaining) <= maxWidth) {
            lines.push(remaining);
            break;
        }
        const isLastLine = lines.length === maxLines - 1;
        let fitting = "";
        // Iterate code points so long titles without spaces also fit safely.
        for (const character of remaining) {
            if (measure(fitting + character + (isLastLine ? "…" : "")) > maxWidth) break;
            fitting += character;
        }
        if (isLastLine) {
            lines.push(`${fitting.trimEnd()}…`);
            break;
        }
        const lastSpace = fitting.lastIndexOf(" ");
        const line = lastSpace > 0 ? fitting.slice(0, lastSpace) : fitting;
        if (!line) break;
        lines.push(line.trimEnd());
        remaining = remaining.slice(line.length).trimStart();
    }
    return lines;
}

export function drawPoster(canvas, track, random = Math.random) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not start the poster canvas.");
    const art = canvas.ownerDocument.createElement("canvas");
    art.width = POSTER_SIZE;
    art.height = POSTER_SIZE;
    const artContext = art.getContext("2d");
    if (!artContext) throw new Error("Your browser could not create the poster artwork.");

    canvas.width = POSTER_SIZE;
    canvas.height = POSTER_SIZE;
    const scale = POSTER_SIZE / DESIGN_SIZE;
    const { features, layers, origin } = createPosterGeometry(track, random);
    context.fillStyle = "white";
    context.fillRect(0, 0, POSTER_SIZE, POSTER_SIZE);
    artContext.scale(scale, scale);
    for (const layer of layers) {
        artContext.fillStyle = layer.color;
        artContext.beginPath();
        artContext.ellipse(layer.x, layer.y, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
        artContext.fill();
    }

    context.filter = `blur(${7 * scale}px)`;
    context.drawImage(art, 0, 0);
    artContext.clearRect(0, 0, DESIGN_SIZE, DESIGN_SIZE);
    artContext.fillStyle = origin.color;
    artContext.beginPath();
    artContext.arc(origin.x, origin.y, origin.size / 2, 0, Math.PI * 2);
    artContext.fill();
    context.filter = `blur(${2 * scale}px)`;
    context.drawImage(art, 0, 0);
    context.filter = "none";

    context.scale(scale, scale);
    context.fillStyle = "#111111";
    context.font = '16px "Courier New", Courier, monospace';
    context.textBaseline = "alphabetic";
    const measure = (text) => context.measureText(text).width;
    const artists = wrapPosterText(features.artists, measure, 450, 1);
    const title = wrapPosterText(features.track_name, measure, 450, 2);
    artists.forEach((line, index) => context.fillText(line, 25, 35 + index * 20));
    title.forEach((line, index) => context.fillText(line, 25, 55 + index * 20));
    return canvas;
}
