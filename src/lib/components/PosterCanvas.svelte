<script>
    import { onMount, onDestroy, createEventDispatcher, tick } from "svelte";

    export let track = null;
    export let className = "";

    const dispatch = createEventDispatcher();

    let canvasContainer;
    let sketchInstance;

    onMount(async () => {

        const sketch = (p) => {
            let energy = 0,
                danceability = 0,
                valence = 0,
                tempo = 0,
                acousticness = 0,
                loudness = 0;
            let artist = "",
                song = "";
            const X = 500;

            p.setup = () => {
                p.createCanvas(X, X);
                p.angleMode(p.DEGREES);
                p.colorMode(p.HSB, 255);
                p.noLoop();
                p.background("#FFFFFF");
                p.pixelDensity(3);
            };

            const clearCanvas = () => {
                p.background("#FFFFFF");
            };

            p.draw = () => {
                let o = X / 2;
                let origin_Size = p.map(loudness, -60, 0, 0.1 * X, 0.2 * X);
                let ellipse_Width = p.map(acousticness, 0, 1, 0.8 * X, 0.4 * X);
                let ellipse_Height = 0.8 * X;
                let angle = p.map(energy, 0, 1, 0, 360);
                let r = p.map(danceability, 0, 1, 0, 100);
                let dx = r * p.cos(angle);
                let dy = r * p.sin(angle);

                p.background("white");
                p.noStroke();

                let multi = p.map(tempo, 0, 250, 0, 10);
                for (let i = 0; i < multi; i++) {
                    let i_x = dx / multi;
                    let i_y = dy / multi;
                    let i_Width = (ellipse_Width - origin_Size) / multi;
                    let i_Height = (ellipse_Height - origin_Size) / multi;
                    let i_hue = p.map(valence, 0, 1, 255, 0);
                    let i_sat = p.map(valence, 0, 1, 0, 255);
                    let i_bri = p.map(valence, 0, 1, 0, 255);

                    p.fill(i_hue - i * p.random(-100, 100), i_sat, i_bri);
                    p.ellipse(
                        o + i_x * i,
                        o + i_y * i,
                        ellipse_Width - i_Width * i,
                        ellipse_Height - i_Height * i,
                    );
                }

                p.filter(p.BLUR, 7);
                let o_hue = p.map(valence, 0, 1, 150, 250);
                let o_sat = p.map(valence, 0, 1, 255, 200);
                let o_bri = p.map(valence, 0, 1, 255, 0);
                p.fill(o_hue, o_sat, o_bri);
                p.circle(o + dx, o + dy, origin_Size);
                p.filter(p.BLUR, 2);

                p.fill("black");
                p.textFont("nitti-typewriter-normal");
                p.textSize(16);
                p.textStyle(p.NORMAL);
                p.text(artist, 25, 35);
                p.text(song, 25, 55);
            };

            p.updateWithProps = async (props) => {
                if (!props) {
                    clearCanvas();
                    p.redraw();
                    return;
                }

                energy = props.energy ?? 0;
                danceability = props.danceability ?? 0;
                valence = props.valence ?? 0;
                loudness = props.loudness ?? -60;
                tempo = props.tempo ?? 0;
                acousticness = props.acousticness ?? 0;
                artist = props.artists ?? "";
                artist = props.artists.replaceAll(';', ', ');
                song = props.track_name ?? "";

                p.redraw();

                requestAnimationFrame(() => {
                    dispatch("generationComplete");
                });
            };
        };

        await tick();

        if (canvasContainer) {
            try {
                sketchInstance = new p5(sketch, canvasContainer);
                if (track) {
                    sketchInstance.updateWithProps(track);
                }
            } catch (error) {
                console.error("Error initializing p5:", error);
            }
        }
    });

    $: if (sketchInstance && track) {
        try {
            sketchInstance.updateWithProps(track);
        } catch (error) {
            console.error("Error updating with props:", error);
        }
    }

    onDestroy(() => {
        if (sketchInstance) {
            sketchInstance.remove();
        }
    });
</script>

<div bind:this={canvasContainer} class="canvas-wrapper {className}"></div>

<style>
    .canvas-wrapper {
        width: 500px;
        height: 500px;
        transition: opacity 0.3s ease-in-out;
    }
    .canvas-wrapper.hidden {
        opacity: 0;
        pointer-events: none;
    }
</style>
