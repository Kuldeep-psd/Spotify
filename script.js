let energy, danceability, valence, tempo, acousticness, loudness = 0;

let artist = '';
let song = '';
var slider;

// Frame
let X = 500;

function setup() {
    createCanvas(X, X);
    angleMode(DEGREES);
    noLoop();
    slider = createSlider(0, 100, 10);
}

function draw() {
  
    // origin
    let o = X/2
    let origin_Size = map(loudness, -60, 0, 0.1 * X, 0.2 * X);

    let ellipse_Width = map(acousticness, 0, 1, 0.8 * X, 0.4*X);
    let ellipse_Height = 0.8 * X;
    let angle = map(energy, 0, 1, 0, 360);
    let r = map(danceability, 0, 1, 0, 100);
  
    let dx = r * cos (angle);
    let dy = r * sin (angle);
  
    noStroke()
  
    background('white');
  
    let multi = map(tempo, 0, 250, 0, 10);
  
    for (let i = 0; i < multi; i++){
      
      let i_x = dx/multi;
      let i_y = dy/multi;

      let i_Width = (ellipse_Width - origin_Size)/multi;
      let i_Height = (ellipse_Height - origin_Size)/multi;
      
      let i_hue = map(valence,0,1,255,0);
      let i_sat = map(valence,0,1,0,255);
      let i_bri = map(valence,0,1,0,255);
      // let i_alp = map(valence,0,1,120,255);
      
      fill(i_hue-(i*random(-100,100)), i_sat, i_bri);
      
      ellipse(o+i_x*i, o+i_y*i, ellipse_Width - (i_Width*i), ellipse_Height - (i_Height*i));
    }
  
    filter(BLUR,7);
  
    let o_hue = map(valence,0,1,150,250);
    let o_sat = map(valence,0,1,255,200);
    let o_bri = map(valence,0,1,255,0);
    // let o_alp = map(valence,0,1,255,150);
  
    fill(o_hue, o_sat, o_bri);
  
    circle(o+dx, o+dy, origin_Size);
    filter(BLUR, 2);
  
    fill("black");
    
    //label
    text(artist, 25, 35);
    text(song, 25, 50);

    energy = slider.value();
}

// Function to update visuals dynamically
function drawPoster(track) {
    redraw();
    energy = track.energy;
    danceability = track.danceability;
    valence = track.valence;
    loudness = track.loudness;
    tempo = track.tempo;
    acousticness = track.acousticness;
    artist = track.artists;
    song = track.track_name;
}