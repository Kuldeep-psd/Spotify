let energy, danceability, valence, tempo, acousticness, loudness = 0;

let artist = '';
let song = '';

function setup() {
  createCanvas(X, X);
  angleMode(DEGREES);
}

// Frame
let X = 500;

function draw() {

  // origin
  let o = X/2
  
  let angle = map(energy, 0, 1, 0, 360);
  let r = map(danceability, 0, 1, 0, 100);

  let dx = r * cos (angle);
  let dy = r * sin (angle);
  
  noStroke()

  background('white');
  fill("pink");
  ellipse(o, o, map(acousticness, 0, 1, 0.8 * X, 0.4*X), 0.8 * X);

  fill("black");
  circle(o+dx, o+dy, map(loudness, -60, 0, 0.1 * X, 0.2 * X));
  
  //label
  text(artist, 25, 35);
  text(song, 25, 50);
}

// Function to update visuals dynamically
function drawPoster(track) {
    energy = track.energy;
    danceability = track.danceability;
    valence = track.valence;
    loudness = track.loudness;
    tempo = track.tempo;
    acousticness = track.acousticness;
    artist = track.artists;
    song = track.track_name;
}