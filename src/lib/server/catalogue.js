import tracks from '../../../tracks.json';
import { createSearchIndex, searchTracks } from './search.js';

// Vite bundles this import into the server build; it does not depend on the
// process working directory or send the full catalogue to the browser.
const index = createSearchIndex(tracks);

export function searchCatalogue(query) {
    return searchTracks(index, query);
}
