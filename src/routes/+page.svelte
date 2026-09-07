<script>
    import { onDestroy } from 'svelte';
    import PosterCanvas from '$lib/components/PosterCanvas.svelte';
    import { formatArtists, posterFilename } from '$lib/poster.js';

    let mode = 'search';
    let searchText = '';
    let suggestions = [];
    let currentTrackInfo = null;
    let searchState = 'idle';
    let searchError = '';
    let searchContainer;
    let searchInput;
    let resultButtons = [];
    let debounceTimer;
    let searchController;
    let searchRequest = 0;
    let sandboxTrackInfo = {
        track_name: 'My sound, in color', artists: 'Made by you',
        energy: 0.75, danceability: 0.8, valence: 0.6,
        loudness: -7, tempo: 125, acousticness: 0.1
    };
    const features = [
        { key: 'energy', label: 'Energy', hint: 'Changes the direction of the composition.', min: 0, max: 1, step: 0.01 },
        { key: 'danceability', label: 'Danceability', hint: 'Moves the shapes away from the center.', min: 0, max: 1, step: 0.01 },
        { key: 'acousticness', label: 'Acousticness', hint: 'Changes the width of the ellipses.', min: 0, max: 1, step: 0.01 },
        { key: 'valence', label: 'Valence', hint: 'Musical positivity. Changes color and brightness.', min: 0, max: 1, step: 0.01 },
        { key: 'loudness', label: 'Loudness', hint: 'Changes the size of the central circle.', min: -60, max: 0, step: 1 },
        { key: 'tempo', label: 'Tempo', hint: 'Changes how many layers appear.', min: 0, max: 250, step: 1 }
    ];
    let posterTrackInfo = null;
    let revision = 0;
    let isGenerating = false;
    let posterIsVisible = false;
    let generationError = '';
    let downloadUrl = '';
    $: downloadFilename = posterFilename(posterTrackInfo?.track_name);
    $: canGenerate = mode === 'sandbox' || !!currentTrackInfo;
    $: posterIsOutdated = mode === 'sandbox' && posterIsVisible &&
        JSON.stringify(sandboxTrackInfo) !== JSON.stringify(posterTrackInfo);

    function cancelSearch() {
        clearTimeout(debounceTimer);
        searchController?.abort();
        searchRequest += 1;
        searchState = 'idle';
    }
    function resetPoster() {
        revision += 1;
        posterTrackInfo = null;
        isGenerating = false;
        posterIsVisible = false;
        generationError = '';
        downloadUrl = '';
    }
    function switchMode(nextMode) {
        if (mode === nextMode) return;
        cancelSearch();
        suggestions = [];
        searchError = '';
        mode = nextMode;
        resetPoster();
    }
    function queueSearch() {
        cancelSearch();
        suggestions = [];
        currentTrackInfo = null;
        searchError = '';
        resetPoster();
        if (searchText.trim().length < 2) return;
        searchState = 'loading';
        const request = searchRequest;
        debounceTimer = setTimeout(() => getSuggestions(request), 250);
    }
    async function getSuggestions(request) {
        const query = searchText.trim();
        const controller = new AbortController();
        searchController = controller;
        let timedOut = false;
        const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 10000);
        try {
            const response = await fetch(`/api/search?${new URLSearchParams({ q: query })}`, { signal: controller.signal });
            if (!response.ok) throw new Error('Search is unavailable. Please try again. You can also create a poster in Sandbox.');
            const tracks = await response.json();
            if (!Array.isArray(tracks)) throw new Error('Search returned an unexpected response. Please try again.');
            if (request !== searchRequest || mode !== 'search') return;
            suggestions = tracks;
            searchState = tracks.length ? 'results' : 'empty';
        } catch (error) {
            if (request !== searchRequest || (controller.signal.aborted && !timedOut)) return;
            suggestions = [];
            searchState = 'error';
            searchError = timedOut ? 'Search took too long. Please try again.' : error.message || 'Could not search. Please try again.';
        } finally {
            clearTimeout(timeout);
        }
    }
    function selectSuggestion(track) {
        cancelSearch();
        suggestions = [];
        searchError = '';
        searchText = track.track_name;
        currentTrackInfo = track;
        resetPoster();
        searchInput?.focus();
    }
    function trySearch(query) {
        searchText = query;
        queueSearch();
        searchInput?.focus();
    }
    function inputKeydown(event) {
        if (event.key === 'Escape') { cancelSearch(); suggestions = []; }
        if (suggestions.length && event.key === 'ArrowDown') {
            event.preventDefault(); resultButtons[0]?.focus();
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            if (suggestions.length) selectSuggestion(suggestions[0]);
            else if (!currentTrackInfo) queueSearch();
        }
    }
    function resultKeydown(event, index) {
        if (event.key === 'ArrowDown') {
            event.preventDefault(); resultButtons[(index + 1) % suggestions.length]?.focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (index === 0) searchInput?.focus(); else resultButtons[index - 1]?.focus();
        } else if (event.key === 'Escape') {
            cancelSearch(); suggestions = []; searchInput?.focus();
        }
    }
    function dismissSuggestions(event) {
        if (suggestions.length && !searchContainer?.contains(event.target)) {
            cancelSearch(); suggestions = [];
        }
    }
    function generatePoster() {
        if (!canGenerate || isGenerating) return;
        generationError = '';
        downloadUrl = '';
        isGenerating = true;
        posterIsVisible = false;
        revision += 1;
        posterTrackInfo = { ...(mode === 'sandbox' ? sandboxTrackInfo : currentTrackInfo) };
    }
    function generationComplete(event) {
        if (event.detail.revision !== revision || !posterTrackInfo) return;
        isGenerating = false;
        posterIsVisible = true;
        downloadUrl = event.detail.downloadUrl;
    }
    function generationFailed(event) {
        if (event.detail.revision !== revision) return;
        isGenerating = false;
        posterIsVisible = false;
        generationError = event.detail.message || 'Could not create the poster. Please try again.';
    }
    function formatFeature(value, key) {
        const number = Number(value);
        if (value == null || !Number.isFinite(number)) return '—';
        if (key === 'tempo') return `${Math.round(number)} BPM`;
        if (key === 'loudness') return `${Math.round(number * 10) / 10} dB`;
        return number.toFixed(2);
    }
    onDestroy(cancelSearch);
</script>

<svelte:head>
    <title>Spotify Poster Generator</title>
    <meta name="description" content="Turn a track’s audio features into an abstract poster. Search the included music catalogue or create your own composition." />
</svelte:head>
<svelte:window on:pointerdown={dismissSuggestions} />

<main>
    <header>
        <p class="eyebrow"><span class="sound-mark" aria-hidden="true">▂ ▆ █ ▄ ▂</span> MUSIC INTO ART</p>
        <h1>Spotify Poster Generator</h1>
        <p class="subtitle">A different way to see your favorite song.</p>
    </header>

    <div class="workspace">
        <section class="controls" aria-label="Poster controls">
            <div class="mode-toggle" role="group" aria-label="Creation mode">
                <button class:active={mode === 'search'} aria-pressed={mode === 'search'} on:click={() => switchMode('search')}>Search</button>
                <button class:active={mode === 'sandbox'} aria-pressed={mode === 'sandbox'} on:click={() => switchMode('sandbox')}>Sandbox</button>
            </div>

            {#if mode === 'search'}
                <div class="section-intro">
                    <h2>Find your track</h2>
                    <p>Search the included catalogue by song or artist. No Spotify login needed.</p>
                </div>
                <div class="search-container" bind:this={searchContainer}>
                    <label for="track-search">Song or artist</label>
                    <div class="search-input-wrap">
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
                        <input id="track-search" type="search" bind:this={searchInput} bind:value={searchText} on:input={queueSearch} on:keydown={inputKeydown} placeholder="Search a song or artist…" autocomplete="off" maxlength="120" aria-describedby="search-help search-status" />
                    </div>
                    <p id="search-help" class="helper">At least 2 characters. Use ↓ to browse results.</p>
                    {#if suggestions.length}
                        <ul class="suggestions-list" aria-label="Matching tracks">
                            {#each suggestions as suggestion, index (suggestion.track_id)}
                                <li><button bind:this={resultButtons[index]} on:click={() => selectSuggestion(suggestion)} on:keydown={(event) => resultKeydown(event, index)}>
                                    <span class="result-title">{suggestion.track_name}</span>
                                    <span class="result-artist">{formatArtists(suggestion.artists)}</span>
                                </button></li>
                            {/each}
                        </ul>
                    {/if}
                    <div id="search-status" class="search-status" role="status" aria-live="polite">
                        {#if searchState === 'loading'}Searching the catalogue…
                        {:else if searchState === 'empty'}No matches. Try another title or artist, or use Sandbox to make your own.
                        {:else if searchState === 'results'}{suggestions.length} matching tracks. Choose one to continue.
                        {:else if searchState === 'error'}<span class="error-text">{searchError}</span> <button class="text-button" on:click={queueSearch}>Retry search</button>{/if}
                    </div>
                </div>
                {#if currentTrackInfo}
                    <div class="selected-track">
                        <p class="eyebrow">SELECTED TRACK</p>
                        <h2>{currentTrackInfo.track_name}</h2>
                        <p>{formatArtists(currentTrackInfo.artists)}</p>
                    </div>
                    <div class="features-grid">
                        {#each features as feature}
                            <div class="feature-item"><span>{feature.label}</span><strong>{formatFeature(currentTrackInfo[feature.key], feature.key)}</strong></div>
                        {/each}
                    </div>
                {:else if searchState === 'idle'}
                    <div class="try-tracks"><p class="helper">A few places to start</p><div class="chips">
                        {#each ['Blinding Lights', 'As It Was', 'Daft Punk'] as query}
                            <button on:click={() => trySearch(query)}>{query}<span aria-hidden="true"> ↗</span></button>
                        {/each}
                    </div></div>
                {/if}
            {:else}
                <div class="section-intro"><h2>Make your own sound</h2><p>Give your poster a name, then shape its color and movement with audio features.</p></div>
                <div class="name-fields">
                    <label for="custom-title">Poster title<input id="custom-title" type="text" maxlength="100" bind:value={sandboxTrackInfo.track_name} placeholder="Untitled track" /></label>
                    <label for="custom-artist">Artist or credit<input id="custom-artist" type="text" maxlength="100" bind:value={sandboxTrackInfo.artists} placeholder="Your name" /></label>
                </div>
                <div class="sandbox-controls">
                    {#each features as feature}
                        <div class="slider-group">
                            <div class="slider-header"><label for={feature.key}>{feature.label}</label><output for={feature.key}>{formatFeature(sandboxTrackInfo[feature.key], feature.key)}</output></div>
                            <input type="range" id={feature.key} min={feature.min} max={feature.max} step={feature.step} bind:value={sandboxTrackInfo[feature.key]} aria-describedby={`${feature.key}-hint`} style={`--progress: ${(sandboxTrackInfo[feature.key] - feature.min) / (feature.max - feature.min) * 100}%`} />
                            <p id={`${feature.key}-hint`} class="slider-hint">{feature.hint}</p>
                        </div>
                    {/each}
                </div>
            {/if}

            <button class="generate-button" on:click={generatePoster} disabled={!canGenerate || isGenerating}>
                {isGenerating ? 'Generating…' : posterIsVisible ? 'Regenerate Poster' : 'Generate Poster'}<span aria-hidden="true">↗</span>
            </button>
            <p class="helper generate-help">{posterIsOutdated ? 'You have changes. Generate again to update the preview.' : !canGenerate ? 'Select a track to create your poster.' : 'Each generation creates a new color variation.'}</p>
        </section>

        <section class="preview-section" aria-label="Poster preview">
            <div class="preview-heading"><span class="eyebrow">YOUR POSTER</span><span class="export-spec">1500 × 1500 PNG</span></div>
            <div class="canvas-container" aria-busy={isGenerating}>
                <PosterCanvas track={posterTrackInfo} {revision} className={!posterIsVisible ? 'hidden' : ''} on:generationComplete={generationComplete} on:generationError={generationFailed} />
                {#if !posterIsVisible && !isGenerating}
                    <div class="canvas-placeholder">
                        <div class="placeholder-art" aria-hidden="true"><i></i><i></i><i></i></div>
                        <h2>Your song, reimagined.</h2>
                        <p>{mode === 'sandbox' ? 'Adjust the features, then generate your own composition.' : 'Choose a track and turn its audio features into a piece of art.'}</p>
                        <span class="placeholder-caption">AUDIO FEATURES → ABSTRACT ART</span>
                    </div>
                {/if}
                {#if isGenerating}<div class="loading-overlay" role="status"><span class="spinner"></span><p>Creating your poster…</p></div>{/if}
            </div>
            <div class="preview-footer">
                <p role="status" aria-live="polite">{isGenerating ? 'Drawing your composition…' : posterIsVisible ? posterIsOutdated ? 'Preview shows your last generation.' : 'Your poster is ready.' : 'Your composition will appear here.'}</p>
                {#if posterIsVisible && downloadUrl}
                    <a class="download-button" href={downloadUrl} download={downloadFilename}>Download PNG<span aria-hidden="true">↓</span></a>
                {:else}
                    <button class="download-button" disabled>Download PNG<span aria-hidden="true">↓</span></button>
                {/if}
            </div>
            {#if generationError}<p class="error-box" role="alert">{generationError}</p>{/if}
            <details class="explanation"><summary>How does a song become a poster?</summary><p>Energy and danceability position the shapes. Acousticness changes their width, loudness sizes the central circle, and tempo adds layers. Valence shapes the color palette. A touch of randomness makes each generation unique.</p></details>
        </section>
    </div>
    <footer>Made from audio features, made to be yours.<span>Uses an included catalogue, not live Spotify search. Some tracks may be unavailable.</span></footer>
</main>

<style>
    :global(*) { box-sizing: border-box; }
    :global(body) { margin: 0; background: #101511; color: #eef2ed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    :global(button), :global(input) { font: inherit; }
    :global(button) { cursor: pointer; }
    :global(a:focus-visible), :global(button:focus-visible), :global(summary:focus-visible), :global(input:focus-visible) { outline: 2px solid #b7f88a; outline-offset: 4px; }
    :global(button:disabled) { cursor: not-allowed; }
    main { min-height: 100vh; padding: 48px 32px 24px; background: radial-gradient(ellipse at 50% 0, #23382970, transparent 60%); }
    header { text-align: center; margin: 0 auto 42px; }
    .eyebrow { font-size: 10px; font-weight: 650; letter-spacing: 2px; color: #a4b5a8; }
    header .eyebrow { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .sound-mark { color: #b7f88a; letter-spacing: 1px; font-size: 17px; }
    h1 { margin: 18px 0 10px; font-size: clamp(28px, 4vw, 46px); font-weight: 580; letter-spacing: -1.8px; line-height: 1.12; }
    .subtitle { color: #a8b7ac; font-size: 15px; margin: 0; }
    .workspace { display: grid; grid-template-columns: minmax(300px, 380px) minmax(0, 570px); gap: clamp(24px, 5vw, 64px); max-width: 1040px; margin: 0 auto; align-items: start; }
    .controls { background: #19221bbc; padding: 24px; border: 1px solid #ffffff12; border-radius: 18px; min-width: 0; }
    .mode-toggle { display: flex; padding: 4px; gap: 4px; background: #0d140f; border-radius: 10px; margin-bottom: 28px; }
    .mode-toggle button { flex: 1; border: none; border-radius: 7px; padding: 11px; background: transparent; color: #a8b7ac; font-size: 13px; font-weight: 600; }
    .mode-toggle button.active { background: #334338; color: #f0f7ed; }
    h2 { font-size: 20px; margin: 0 0 8px; letter-spacing: -.5px; }
    .section-intro > p { font-size: 13px; line-height: 1.6; color: #a8b7ac; margin: 0 0 24px; }
    label { display: block; font-size: 12px; color: #c6d2c9; }
    input[type='search'], input[type='text'] { width: 100%; padding: 13px 12px; min-height: 44px; border: 1px solid #ffffff26; border-radius: 8px; background: #111912; color: #eef2ed; margin-top: 8px; font-size: 14px; }
    input::placeholder { color: #829888; }
    input:focus { border-color: #b7f88a; }
    .search-container { position: relative; }
    .search-input-wrap { position: relative; }
    .search-input-wrap svg { position: absolute; top: 22px; left: 12px; color: #a8b7ac; }
    input[type='search'] { padding-left: 39px; }
    .helper { color: #96ab9d; font-size: 11px; line-height: 1.6; margin: 9px 0 0; }
    .search-status { font-size: 12px; line-height: 1.6; color: #b7c6bc; margin-top: 10px; }
    .search-status:empty { display: none; }
    .suggestions-list { list-style: none; margin: 10px 0 0; padding: 4px; background: #25362a; border: 1px solid #ffffff26; border-radius: 10px; max-height: 320px; overflow: auto; }
    .suggestions-list button { display: block; width: 100%; text-align: left; padding: 11px 10px; border: none; background: none; color: #f0f7ed; border-radius: 6px; }
    .suggestions-list button:hover, .suggestions-list button:focus-visible { background: #3b5141; outline-offset: -2px; }
    .result-title { display: block; font-size: 13px; overflow-wrap: anywhere; }
    .result-artist { display: block; color: #b2c4b8; margin-top: 4px; font-size: 11px; overflow-wrap: anywhere; }
    .try-tracks { margin: 24px 0 28px; }
    .chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 9px; }
    .chips button { font-size: 11px; padding: 9px 11px; border: 1px solid #ffffff24; background: #ffffff05; color: #c6d2c9; border-radius: 7px; }
    .chips button:hover { background: #ffffff10; }
    .selected-track { margin: 26px 0 20px; border-top: 1px solid #ffffff16; padding-top: 18px; }
    .selected-track h2 { overflow-wrap: anywhere; }
    .selected-track > p:last-child { margin: 0; color: #a8b7ac; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
    .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 24px; }
    .feature-item { background: #101711; border: 1px solid #ffffff0c; border-radius: 8px; padding: 12px; }
    .feature-item span { display: block; font-size: 11px; color: #a8b7ac; }
    .feature-item strong { display: block; font-size: 17px; font-weight: 500; color: #b7f88a; margin-top: 7px; font-variant-numeric: tabular-nums; }
    .name-fields { display: grid; gap: 14px; margin-bottom: 26px; }
    .sandbox-controls { display: grid; gap: 17px; margin-bottom: 26px; }
    .slider-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    output { font-size: 11px; font-variant-numeric: tabular-nums; color: #c8e4bb; }
    input[type='range'] { appearance: none; width: 100%; margin: 8px 0 0; padding: 0; height: 20px; background: transparent; cursor: pointer; }
    input[type='range']::-webkit-slider-runnable-track { height: 3px; border-radius: 3px; background: linear-gradient(to right, #b7f88a var(--progress), #425346 var(--progress)); }
    input[type='range']::-webkit-slider-thumb { appearance: none; width: 13px; height: 13px; margin-top: -5px; border-radius: 50%; background: #dbf7ca; }
    input[type='range']::-moz-range-track { height: 3px; border-radius: 3px; background: #425346; }
    input[type='range']::-moz-range-progress { background: #b7f88a; height: 3px; }
    input[type='range']::-moz-range-thumb { width: 13px; height: 13px; border: 0; border-radius: 50%; background: #dbf7ca; }
    .slider-hint { font-size: 10px; line-height: 1.5; color: #96ab9d; margin: 1px 0 0; }
    .generate-button { width: 100%; display: flex; justify-content: space-between; align-items: center; border: 0; border-radius: 9px; padding: 15px 18px; background: #b7f88a; color: #17270f; font-size: 13px; font-weight: 650; margin-top: 24px; min-height: 48px; }
    .generate-button:hover:enabled { background: #caffaa; }
    .generate-button:disabled { background: #354339; color: #a6b5aa; }
    .generate-help { text-align: center; }
    .preview-section { min-width: 0; position: sticky; top: 28px; }
    .preview-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0 14px; }
    .export-spec { font-size: 10px; letter-spacing: .5px; color: #96ab9d; }
    .canvas-container { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; background: #eeeae1; border-radius: 4px; box-shadow: 0 18px 70px #00000028; }
    .canvas-placeholder, .loading-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; text-align: center; }
    .canvas-placeholder { color: #25372c; }
    .canvas-placeholder h2 { font-size: clamp(20px, 2.2vw, 25px); margin-top: 26px; }
    .canvas-placeholder p { font-size: 12px; color: #657566; max-width: 240px; line-height: 1.7; margin: 2px 0 0; }
    .placeholder-caption { color: #7d8d7e; font-size: 8px; letter-spacing: 1.8px; margin-top: 36px; }
    .placeholder-art { position: relative; width: 160px; height: 130px; opacity: .8; }
    .placeholder-art i { position: absolute; width: 135px; height: 120px; left: 0; top: 0; border-radius: 50%; background: #9eaf86; filter: blur(7px); }
    .placeholder-art i:nth-child(2) { width: 95px; height: 95px; left: 53px; top: 22px; background: #5e886a; filter: blur(5px); }
    .placeholder-art i:nth-child(3) { width: 43px; height: 43px; top: 55px; left: 75px; background: #bacb7a; filter: blur(2px); }
    .loading-overlay { background: #eeeae1; color: #25372c; font-size: 13px; }
    .spinner { width: 26px; height: 26px; border: 2px solid #becbb7; border-top-color: #365b32; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .preview-footer { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 17px; }
    .preview-footer p { font-size: 11px; color: #a8b7ac; margin: 0; line-height: 1.5; }
    .download-button { text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 16px; border: 1px solid #76917c; color: #e1eddf; border-radius: 8px; background: transparent; padding: 11px 14px; font-size: 11px; min-height: 44px; flex-shrink: 0; }
    a.download-button:hover { background: #ffffff0b; }
    .download-button:disabled { color: #7e9486; border-color: #425347; }
    .explanation { font-size: 12px; border-top: 1px solid #ffffff14; margin-top: 24px; padding-top: 18px; color: #a8b7ac; }
    summary { cursor: pointer; padding: 5px 0; }
    .explanation p { font-size: 12px; line-height: 1.8; color: #96ab9d; }
    .error-box { font-size: 13px; line-height: 1.6; background: #582e252e; border: 1px solid #e998795e; padding: 14px; border-radius: 8px; color: #f8b99e; }
    .error-text { color: #f8b99e; }
    .text-button { border: 0; background: none; color: #b7f88a; padding: 4px; text-decoration: underline; font-size: 12px; }
    footer { margin: 48px auto 0; max-width: 1040px; text-align: center; font-size: 11px; line-height: 1.7; color: #96ab9d; }
    footer span { display: block; font-size: 10px; color: #829888; margin-top: 3px; }
    @media (max-width: 760px) {
        main { padding: 30px 18px 24px; }
        header { margin-bottom: 28px; }
        h1 { letter-spacing: -1px; }
        .workspace { grid-template-columns: minmax(0, 1fr); max-width: 520px; gap: 30px; }
        .preview-section { position: static; }
        .controls { padding: 20px; }
        .preview-footer { gap: 10px; }
    }
    @media (max-width: 360px) {
        main { padding-inline: 12px; }
        .controls { padding: 16px; }
        .canvas-placeholder { padding: 18px; }
        .placeholder-art { transform: scale(.8); height: 110px; }
        .placeholder-caption { margin-top: 18px; }
    }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>
