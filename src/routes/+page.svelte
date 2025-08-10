<script>
    import PosterCanvas from "$lib/components/PosterCanvas.svelte";

    let searchText = "";
    let suggestions = [];

    let currentTrackInfo = null;
    let posterTrackInfo = null;
    let isGenerating = false;
    let posterIsVisible = false;
    let isShowingSkeleton = false;

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
        debounceTimer = setTimeout(() => {
            getSuggestions();
        }, 300);
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
            posterTrackInfo = currentTrackInfo;
        }, 50);
    }

    function handleGenerationComplete() {
        isGenerating = false;
        posterIsVisible = true;
    }

    function downloadPoster() {
        const canvas = document.querySelector("canvas");
        if (canvas) {
            const link = document.createElement("a");
            link.download = `${currentTrackInfo.track_name}_poster.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        }
    }
</script>

<main>
    <!-- ✅ NEW: Animated Background -->
    <div class="background-animation"></div>

    <div class="container">
        <header>
            <h1>Spotify Poster Generator</h1>
            <p class="subtitle">
                Visualize the audio features of your favorite tracks.
            </p>
        </header>

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
                                on:click={() => selectSuggestion(suggestion)}
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

        {#if currentTrackInfo}
            <div class="content-wrapper">
                <div class="canvas-container">
                    {#if !posterIsVisible && !isGenerating}
                        <div class="canvas-placeholder">
                            <p>
                                Click "Generate Poster" to create the
                                visualization.
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
                    <h3 class:skeleton={isShowingSkeleton}>
                        {#if !isShowingSkeleton}{currentTrackInfo.track_name}{:else}&nbsp;{/if}
                    </h3>
                    <p class="artist-name" class:skeleton={isShowingSkeleton}>
                        {#if !isShowingSkeleton}by {currentTrackInfo.artists.replaceAll(
                                ";",
                                ", ",
                            )}{:else}&nbsp;{/if}
                    </p>

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

                    {#if currentTrackInfo && !posterIsVisible}
                        <button
                            on:click={handleGenerateClick}
                            class="action-button generate-button"
                            disabled={isGenerating}
                        >
                            {isGenerating ? "Generating..." : "Generate Poster"}
                        </button>
                    {/if}

                    {#if posterIsVisible}
                        <button
                            on:click={downloadPoster}
                            class="action-button download-button"
                        >
                            Download Poster
                        </button>
                    {/if}
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
        overflow-x: hidden;
        padding-bottom: 2rem;
    }

    .background-animation {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(45deg, #121212, #1d232a, #121212, #452f7a);
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
        font-size: 5rem;
        font-family: "fit", sans-serif;
        font-weight: 400;
        font-style: normal;
        margin-bottom: 0.5rem;
    }
    .subtitle {
        font-size: 1.1rem;
        color: #a0a0a0;
    }
    .search-container {
        position: relative;
        margin-bottom: 2.5rem;
    }

    /* ✅ NEW: Glassmorphism Effect */
    input,
    .suggestions-list,
    .track-details {
        background-color: rgba(
            30,
            30,
            30,
            0.6
        ); /* Semi-transparent background */
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px); /* For Safari */
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
        margin-top: -1px; /* Overlap border */
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
        width: 500px;
        height: 500px;
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
    .features-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .feature-item {
        background-color: rgba(0, 0, 0, 0.2); /* Darker glass for contrast */
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
    .download-button {
        background-color: #1db954;
        color: #121212;
    }
    .download-button:hover {
        background-color: #1ed760;
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
