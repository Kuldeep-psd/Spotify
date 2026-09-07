# Spotify Poster Generator

A SvelteKit app that turns track audio features into downloadable posters. Search
by title or artist, or use Sandbox to adjust the audio features yourself.

## Run locally

Use Node.js 22.12+ within the Node 22 release line (`nvm use`), then run:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173.
No Spotify account, API key, Supabase service, or `.env` file is required.

Search uses the checked-in `tracks.json` catalogue of 114,000 records, with
duplicate track IDs and repeated title/artist pairs removed when indexed. It is a static catalogue, not live
Spotify search, so newer or missing tracks may not be available. Search ignores
case and accents, accepts title and artist terms together, and returns up to 10
results. Queries longer than 120 characters return no results.

## Verify and build

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

The catalogue is bundled on the server; only matching records are returned to the
browser. Production uses `@sveltejs/adapter-vercel` with the SvelteKit framework
preset from `vercel.json`. The existing Vercel project is
`spotify-poster-generator`, linked to the `main` branch of
`Kuldeep-psd/Spotify`. No environment variables are required for deployment.

Posters use the browser's built-in Canvas renderer, with no external scripts or
fonts. PNG downloads are 1500 × 1500 pixels regardless of the preview size.
Regenerating varies the layer colors while the audio features determine the
geometry. Sandbox includes editable titles and credits; changes take effect when
you generate again.
