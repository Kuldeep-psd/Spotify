<script>
    import PosterCanvas from "$lib/components/PosterCanvas.svelte";

    // --- State Management ---
    let mode = "search"; // 'search' or 'sandbox'

    // Search Mode State
    let searchText = "";
    let suggestions = [];
    let currentTrackInfo = null;
    let isShowingSkeleton = false;

    // Sandbox Mode State
    let sandboxTrackInfo = {
        track_name: "",
        artists: "",
        energy: 0.75,
        danceability: 0.8,
        valence: 0.6,
        loudness: -7,
        tempo: 125,
        acousticness: 0.1,
    };

    // Shared State
    let posterTrackInfo = null;
    let isGenerating = false;
    let posterIsVisible = false;
    let debounceTimer;

    async function getSuggestions() {
        if (searchText.length < 1) {
            suggestions = [];
            return;
        }
        const response = await fetch(`/api/search?q=${searchText}`);
        if (response.ok) {
            suggestions = await response.json();
        }
    }

    function debouncedGetSuggestions() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => getSuggestions(), 300);
    }

    function selectSuggestion(track) {
        suggestions = [];
        searchText = track.track_name;
        isShowingSkeleton = true;
        currentTrackInfo = track;
        isGenerating = false;
        posterIsVisible = false;
        posterTrackInfo = null;

        setTimeout(() => {
            isShowingSkeleton = false;
        }, 100);
    }

    function handleGenerateClick() {
        isGenerating = true;
        posterIsVisible = false;

        setTimeout(() => {
            if (mode === "sandbox") {
                posterTrackInfo = { ...sandboxTrackInfo };
            } else {
                posterTrackInfo = currentTrackInfo;
            }
        }, 50);
    }

    function handleGenerationComplete() {
        isGenerating = false;
        posterIsVisible = true;
    }

    function downloadPoster() {
        const canvas = document.querySelector("canvas");
        if (canvas) {
            const trackName =
                mode === "sandbox"
                    ? "custom_poster"
                    : currentTrackInfo.track_name;
            const link = document.createElement("a");
            link.download = `${trackName}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        }
    }
</script>

<main>
    <div class="background-animation"></div>

    <div class="container">
        <header>
            <h1>Spotify Poster Generator</h1>
            <p class="subtitle">
                Visualize the audio features of your favorite tracks.
            </p>
        </header>

        <div class="mode-toggle">
            <button
                class:active={mode === "search"}
                on:click={() => (mode = "search")}>Search</button
            >
            <button
                class:active={mode === "sandbox"}
                on:click={() => (mode = "sandbox")}>Sandbox</button
            >
        </div>

        {#if mode === "search"}
            <div class="search-container">
                <input
                    type="text"
                    bind:value={searchText}
                    on:input={debouncedGetSuggestions}
                    placeholder="Search for a track title..."
                    autocomplete="off"
                />
                {#if suggestions.length > 0}
                    <ul class="suggestions-list">
                        {#each suggestions as suggestion (suggestion.track_id)}
                            <li>
                                <button
                                    on:click={() =>
                                        selectSuggestion(suggestion)}
                                >
                                    {suggestion.track_name}
                                    <span class="artist"
                                        >by {suggestion.artists.replaceAll(
                                            ";",
                                            ", ",
                                        )}</span
                                    >
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/if}

        {#if (mode === "search" && currentTrackInfo) || mode === "sandbox"}
            <div class="content-wrapper">
                <div class="canvas-container">
                    {#if posterIsVisible}
                        <button
                            class="download-icon-button"
                            on:click={downloadPoster}
                            title="Download Poster"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path
                                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                                ></path><polyline points="7 10 12 15 17 10"
                                ></polyline><line x1="12" y1="15" x2="12" y2="3"
                                ></line></svg
                            >
                        </button>
                    {/if}

                    {#if !posterIsVisible && !isGenerating}
                        <div class="canvas-placeholder">
                            <p>
                                {mode === "sandbox"
                                    ? 'Adjust the sliders and hit "Generate"'
                                    : 'Click "Generate Poster" to create the visualization.'}
                            </p>
                        </div>
                    {/if}

                    {#if isGenerating}
                        <div class="loading-overlay">
                            <div class="sound-wave-loader">
                                <span></span><span></span><span></span><span
                                ></span><span></span>
                            </div>
                        </div>
                    {/if}

                    <PosterCanvas
                        track={posterTrackInfo}
                        className={!posterIsVisible ? "hidden" : ""}
                        on:generationComplete={handleGenerationComplete}
                    />
                </div>

                <div class="track-details">
                    {#if mode === "search"}
                        <h3 class:skeleton={isShowingSkeleton}>
                            {#if !isShowingSkeleton}{currentTrackInfo.track_name}{:else}&nbsp;{/if}
                        </h3>
                        <p
                            class="artist-name"
                            class:skeleton={isShowingSkeleton}
                        >
                            {#if !isShowingSkeleton}by {currentTrackInfo.artists.replaceAll(
                                    ";",
                                    ", ",
                                )}{:else}&nbsp;{/if}
                        </p>
                    {:else}
                        <h3>{"Sandbox Mode"}</h3>
                        <p class="artist-name">{"Create a custom poster"}</p>
                    {/if}

                    {#if mode === "sandbox"}
                        <div class="sandbox-controls">
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label for="energy">Energy</label>
                                    <span class="slider-value"
                                        >{sandboxTrackInfo.energy.toFixed(
                                            2,
                                        )}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    id="energy"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    bind:value={sandboxTrackInfo.energy}
                                    style="--progress-percent: {sandboxTrackInfo.energy *
                                        100}%"
                                />
                            </div>
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label for="dance">Danceability</label>
                                    <span class="slider-value"
                                        >{sandboxTrackInfo.danceability.toFixed(
                                            2,
                                        )}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    id="dance"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    bind:value={sandboxTrackInfo.danceability}
                                    style="--progress-percent: {sandboxTrackInfo.danceability *
                                        100}%"
                                />
                            </div>
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label for="acoustic">Acousticness</label>
                                    <span class="slider-value"
                                        >{sandboxTrackInfo.acousticness.toFixed(
                                            2,
                                        )}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    id="acoustic"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    bind:value={sandboxTrackInfo.acousticness}
                                    style="--progress-percent: {sandboxTrackInfo.acousticness *
                                        100}%"
                                />
                            </div>
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label for="valence">Valence</label>
                                    <span class="slider-value"
                                        >{sandboxTrackInfo.valence.toFixed(
                                            2,
                                        )}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    id="valence"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    bind:value={sandboxTrackInfo.valence}
                                    style="--progress-percent: {sandboxTrackInfo.valence *
                                        100}%"
                                />
                            </div>
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label for="loudness">Loudness</label>
                                    <span class="slider-value"
                                        >{sandboxTrackInfo.loudness} dB</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    id="loudness"
                                    min="-60"
                                    max="0"
                                    step="1"
                                    bind:value={sandboxTrackInfo.loudness}
                                    style="--progress-percent: {((sandboxTrackInfo.loudness +
                                        60) /
                                        60) *
                                        100}%"
                                />
                            </div>
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label for="tempo">Tempo</label>
                                    <span class="slider-value"
                                        >{sandboxTrackInfo.tempo} BPM</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    id="tempo"
                                    min="50"
                                    max="250"
                                    step="1"
                                    bind:value={sandboxTrackInfo.tempo}
                                    style="--progress-percent: {((sandboxTrackInfo.tempo -
                                        50) /
                                        200) *
                                        100}%"
                                />
                            </div>
                        </div>
                    {/if}

                    {#if mode === "search"}
                        <div class="features-grid">
                            <div class="feature-item">
                                <span class="label">Energy</span>
                                <span
                                    class="value"
                                    class:skeleton={isShowingSkeleton}
                                >
                                    {#if !isShowingSkeleton}{currentTrackInfo.energy}{:else}&nbsp;{/if}
                                </span>
                            </div>
                            <div class="feature-item">
                                <span class="label">Danceability</span>
                                <span
                                    class="value"
                                    class:skeleton={isShowingSkeleton}
                                >
                                    {#if !isShowingSkeleton}{currentTrackInfo.danceability}{:else}&nbsp;{/if}
                                </span>
                            </div>
                            <div class="feature-item">
                                <span class="label">Acousticness</span>
                                <span
                                    class="value"
                                    class:skeleton={isShowingSkeleton}
                                >
                                    {#if !isShowingSkeleton}{currentTrackInfo.acousticness}{:else}&nbsp;{/if}
                                </span>
                            </div>
                            <div class="feature-item">
                                <span class="label">Loudness</span>
                                <span
                                    class="value"
                                    class:skeleton={isShowingSkeleton}
                                >
                                    {#if !isShowingSkeleton}{currentTrackInfo.loudness}
                                        dB{:else}&nbsp;{/if}
                                </span>
                            </div>
                            <div class="feature-item">
                                <span class="label">Tempo</span>
                                <span
                                    class="value"
                                    class:skeleton={isShowingSkeleton}
                                >
                                    {#if !isShowingSkeleton}{Math.floor(
                                            currentTrackInfo.tempo,
                                        )} BPM{:else}&nbsp;{/if}
                                </span>
                            </div>
                            <div class="feature-item">
                                <span class="label">Valence</span>
                                <span
                                    class="value"
                                    class:skeleton={isShowingSkeleton}
                                >
                                    {#if !isShowingSkeleton}{currentTrackInfo.valence}{:else}&nbsp;{/if}
                                </span>
                            </div>
                        </div>
                    {/if}

                    <button
                        on:click={handleGenerateClick}
                        class="action-button generate-button"
                        disabled={isShowingSkeleton || isGenerating}
                    >
                        {isGenerating ? "Generating..." : "Generate Poster"}
                    </button>
                </div>
            </div>
        {/if}
    </div>
</main>

<style>
    :global(body) {
        background-color: #121212;
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        margin: 0;
        padding: 1rem;
        overflow-x: hidden;
    }

    .background-animation {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(45deg, #121212, #1d2a21, #121212, #211d2a);
        background-size: 400% 400%;
        animation: gradient-flow 25s ease infinite;
        z-index: -1;
    }

    @keyframes gradient-flow {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    .container {
        max-width: 960px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
    }
    header {
        text-align: center;
        margin-bottom: 2.5rem;
    }
    h1 {
        font-size: 3rem;
        font-family: "fit", sans-serif;
        font-weight: 400;
        font-style: normal;        
        margin-bottom: 0.5rem;
    }
    .subtitle {
        font-size: 1.1rem;
        color: #a0a0a0;
    }

    .mode-toggle {
        display: flex;
        justify-content: center;
        margin-bottom: 2.5rem;
        background-color: rgba(30, 30, 30, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50px;
        padding: 4px;
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
    }
    .mode-toggle button {
        background: none;
        border: none;
        color: #a0a0a0;
        padding: 0.5rem 1.5rem;
        border-radius: 50px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s ease;
    }
    .mode-toggle button.active {
        background-color: #333;
        color: #ffffff;
    }

    .search-container {
        position: relative;
        margin-bottom: 2.5rem;
    }

    input,
    .suggestions-list,
    .track-details {
        background-color: rgba(30, 30, 30, 0.6);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    input {
        width: 100%;
        padding: 1rem;
        font-size: 1rem;
        border-radius: 8px;
        color: #e0e0e0;
        box-sizing: border-box;
        transition:
            border-color 0.2s,
            box-shadow 0.2s;
    }
    input:focus {
        outline: none;
        border-color: #1db954;
        box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.3);
    }
    .suggestions-list {
        position: absolute;
        width: 100%;
        border-top: none;
        border-radius: 0 0 8px 8px;
        list-style-type: none;
        padding: 0;
        margin-top: -1px;
        overflow: hidden;
        z-index: 10;
        text-align: left;
    }
    .suggestions-list li {
        padding: 0;
    }
    .suggestions-list li button {
        width: 100%;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    .suggestions-list li button:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    .suggestions-list .artist {
        display: block;
        font-size: 0.85rem;
        color: #a0a0a0;
        margin-top: 2px;
    }
    .content-wrapper {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        align-items: center;
    }
    .canvas-container {
        position: relative;
        flex-shrink: 0;
        width: 100%;
        max-width: 500px;
        aspect-ratio: 1 / 1;
        height: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(30, 30, 30, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        overflow: hidden;
    }
    .canvas-placeholder,
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .canvas-placeholder {
        color: #a0a0a0;
    }
    .loading-overlay {
        background-color: rgba(30, 30, 30, 0.8);
        z-index: 5;
    }
    .track-details {
        width: 100%;
        max-width: 500px;
        padding: 1.5rem;
        border-radius: 12px;
        box-sizing: border-box;
    }
    .track-details h3 {
        margin-top: 0;
        font-size: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
        min-height: 27px;
    }
    .artist-name {
        color: #a0a0a0;
        margin-top: -0.5rem;
        margin-bottom: 1.5rem;
        min-height: 21px;
    }

    .sandbox-controls {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        margin-bottom: 2rem;
    }
    .slider-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .slider-header label {
        font-size: 0.9rem;
        color: #a0a0a0;
    }
    .slider-value {
        font-size: 0.9rem;
        font-weight: 500;
        color: #e0e0e0;
        background-color: rgba(0, 0, 0, 0.2);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
    }
    input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        cursor: pointer;
        background: transparent; /* Remove default background */
        height: 16px; /* Height for the thumb to move within */
    }
    /* Track */
    input[type="range"]::-webkit-slider-runnable-track {
        height: 3px;
        background: linear-gradient(
            to right,
            #1db954 var(--progress-percent),
            #444 var(--progress-percent)
        );
        border-radius: 5px;
    }
    input[type="range"]::-moz-range-track {
        height: 3px;
        background: #444;
        border-radius: 5px;
    }
    /* Thumb */
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        margin-top: -6.5px; /* (thumb height - track height) / -2 */
        width: 16px;
        height: 16px;
        background: #e0e0e0;
        border-radius: 50%;
        border: 1px solid #555;
    }
    input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #e0e0e0;
        border-radius: 50%;
        border: 1px solid #555;
    }
    /* Filled part of the track for Firefox */
    input[type="range"]::-moz-range-progress {
        background-color: #1db954;
        height: 3px;
        border-radius: 5px;
    }

    .features-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .feature-item {
        background-color: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.05);
        padding: 1rem;
        border-radius: 8px;
    }
    .feature-item .label {
        display: block;
        font-size: 0.8rem;
        color: #a0a0a0;
        margin-bottom: 0.25rem;
    }
    .feature-item .value {
        font-size: 1.2rem;
        font-weight: 500;
        color: #1db954;
        min-height: 24px;
        display: block;
    }
    .action-button {
        width: 100%;
        padding: 1rem;
        font-size: 1rem;
        font-weight: 600;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        transition:
            background-color 0.2s,
            transform 0.1s;
    }
    .action-button:hover {
        transform: scale(1.02);
    }
    .action-button:disabled {
        background-color: #282828;
        color: #535353;
        cursor: not-allowed;
        transform: none;
    }
    .generate-button {
        background-color: #535353;
        color: #ffffff;
    }
    .generate-button:hover:not(:disabled) {
        background-color: #737373;
    }

    .download-icon-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        z-index: 10;
        background-color: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    .download-icon-button:hover {
        background-color: rgba(0, 0, 0, 0.8);
    }

    .sound-wave-loader {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        height: 60px;
        gap: 6px;
    }
    .sound-wave-loader span {
        display: block;
        width: 7px;
        height: 100%;
        background-color: #1db954;
        border-radius: 3px;
        animation: wave 1.2s infinite ease-in-out;
    }
    .sound-wave-loader span:nth-child(2) {
        animation-delay: 0.2s;
    }
    .sound-wave-loader span:nth-child(3) {
        animation-delay: 0.4s;
    }
    .sound-wave-loader span:nth-child(4) {
        animation-delay: 0.6s;
    }
    .sound-wave-loader span:nth-child(5) {
        animation-delay: 0.8s;
    }

    .skeleton {
        color: transparent;
        border-radius: 4px;
        user-select: none;
        background: linear-gradient(
            90deg,
            #2a2a2a 25%,
            #3a3a3a 50%,
            #2a2a2a 75%
        );
        background-size: 200% 100%;
        animation: skeleton-shine 1.5s linear infinite;
    }

    @keyframes wave {
        0% {
            transform: scaleY(0.1);
        }
        50% {
            transform: scaleY(1);
        }
        100% {
            transform: scaleY(0.1);
        }
    }

    @keyframes skeleton-shine {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }

    @media (min-width: 800px) {
        :global(body) {
            padding-bottom: 2rem;
        }

        h1 {
            font-size: 5rem;
        }

        .content-wrapper {
            flex-direction: row;
            align-items: flex-start;
        }
        .track-details {
            width: 280px;
            flex-shrink: 0;
        }
    }
</style>
