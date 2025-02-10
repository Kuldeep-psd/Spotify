async function processTrack() {
  const urlInput = document.getElementById("spotify-url").value;
  const trackID = extractTrackID(urlInput);

  if (!trackID) {
      alert("Invalid Spotify URL!");
      return;
  }

  const trackData = await findTrack(trackID);
  if (trackData) {
      document.getElementById("output").innerHTML = `
          <h3>${trackData.track_name} - ${trackData.artists}</h3>
          <p>Energy: ${trackData.energy}, Danceability: ${trackData.danceability}</p>
      `;

      drawPoster(trackData);  // Send track data to p5.js
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
