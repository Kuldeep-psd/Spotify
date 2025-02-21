async function processTrack() {
  const userInput = document.getElementById("spotify-url").value.trim();
  let trackID = extractTrackID(userInput);

  // If input is not a URL, assume it's a direct track ID
  if (!trackID) {
      trackID = userInput.match(/^[a-zA-Z0-9]+$/) ? userInput : null;
  }

  if (!trackID) {
      alert("Invalid Spotify URL or Track ID!");
      return;
  }

  const trackData = await findTrack(trackID);
  if (trackData) {
      document.getElementById("output").innerHTML = `
          <h3>${trackData.track_name} - ${trackData.artists}</h3>
          <p>Energy: ${trackData.energy}, Danceability: ${trackData.danceability}, 
          Valence: ${trackData.valence}, Tempo: ${trackData.tempo}, 
          Acousticness: ${trackData.acousticness}, Loudness: ${trackData.loudness}</p>
      `;

      drawPoster(trackData); // Send track data to p5.js
  } else {
      alert("Track not found in dataset.");
  }
}

// Extract Track ID from Spotify link
function extractTrackID(url) {
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Fetch and search track in JSON
async function findTrack(trackID) {
  try {
      const response = await fetch("tracks.json");
      const tracks = await response.json();
      console.log("Loaded Dataset:", tracks);
      console.log("Searching for Track ID:", trackID);

      // Search for a match using "track_id"
      const track = tracks.find(track => track.track_id.trim() === trackID.trim());

      if (!track) console.warn("Track not found:", trackID);
      return track;
  } catch (error) {
      console.error("Error loading dataset:", error);
  }
}