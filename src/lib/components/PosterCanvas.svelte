<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { drawPoster, normalizePosterTrack, POSTER_SIZE, posterFilename } from "$lib/poster.js";

    export let track = null;
    export let className = "";
    export let revision = 0;

    const dispatch = createEventDispatcher();
    let canvas;
    let mounted = false;
    let frame;
    let renderSequence = 0;
    let downloadUrl = null;

    $: description = track
        ? `Abstract audio-feature poster for ${normalizePosterTrack(track).track_name} by ${normalizePosterTrack(track).artists}`
        : "Your generated music poster will appear here";

    function releaseDownloadUrl() {
        if (!downloadUrl) return;
        const previousUrl = downloadUrl;
        downloadUrl = null;
        // Preserve a download already initiated just before the next render.
        setTimeout(() => URL.revokeObjectURL(previousUrl), 1000);
    }

    function queueRender(nextTrack, nextRevision) {
        const sequence = ++renderSequence;
        cancelAnimationFrame(frame);
        releaseDownloadUrl();

        if (!nextTrack) {
            canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        frame = requestAnimationFrame(async () => {
            if (!mounted || sequence !== renderSequence) return;
            try {
                drawPoster(canvas, nextTrack);
                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob((result) => {
                        if (result) resolve(result);
                        else reject(new Error("The PNG could not be created. Please try again."));
                    }, "image/png");
                });
                const generatedUrl = URL.createObjectURL(blob);
                if (!mounted || sequence !== renderSequence) {
                    URL.revokeObjectURL(generatedUrl);
                    return;
                }
                downloadUrl = generatedUrl;
                dispatch("generationComplete", {
                    revision: nextRevision,
                    downloadUrl,
                    filename: posterFilename(normalizePosterTrack(nextTrack).track_name),
                });
            } catch (error) {
                if (!mounted || sequence !== renderSequence) return;
                releaseDownloadUrl();
                dispatch("generationError", {
                    revision: nextRevision,
                    message: error instanceof Error ? error.message : "The poster could not be rendered. Please try again.",
                });
            }
        });
    }

    onMount(() => {
        mounted = true;
        return () => {
            mounted = false;
            renderSequence += 1;
            cancelAnimationFrame(frame);
            releaseDownloadUrl();
        };
    });

    $: if (mounted && canvas) queueRender(track, revision);
</script>

<div class="canvas-wrapper {className}" role="img" aria-label={description} aria-hidden={!track || className.split(' ').includes('hidden')}>
    <canvas
        bind:this={canvas}
        width={POSTER_SIZE}
        height={POSTER_SIZE}
        aria-hidden="true"
    ></canvas>
</div>

<style>
    .canvas-wrapper {
        width: 100%;
        min-width: 0;
        aspect-ratio: 1;
        transition: opacity 0.2s ease-in-out;
    }

    canvas {
        display: block;
        width: 100%;
        height: auto;
        aspect-ratio: 1;
    }

    .canvas-wrapper.hidden {
        opacity: 0;
        pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
        .canvas-wrapper { transition: none; }
    }
</style>
