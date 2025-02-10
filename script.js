let energy = 0;
let danceability = 0;
let artist = '';
let song = '';

function setup() {
    createCanvas(500, 500);
}

function draw() {
    noStroke()
    background('white');
    fill("black");
    circle(width/2,height/2,energy*500);
    text(artist, 25, 35);
    text(song, 25, 50);

}

// Function to update visuals dynamically
function drawPoster(track) {
    energy = track.energy;
    danceability = track.danceability;
    artist = track.artists;
    song = track.track_name;
}
