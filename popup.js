document.addEventListener('DOMContentLoaded', function() {
  // 1. Grab the HTML elements we need using their IDs
  const generateBtn = document.getElementById('generateBtn');
  const urlInput = document.getElementById('youtubeUrl');
  const statusDiv = document.getElementById('status');

  // 2. Listen for a 'click' event on our button
  generateBtn.addEventListener('click', function() {
    
    // 3. Get the text the user typed into the input field
    const url = urlInput.value;

    // 4. Extract the Video ID
    const videoId = extractVideoId(url);

    if (videoId) {
      console.log("Success! Video ID is:", videoId);
      statusDiv.textContent = "Video ID extracted: " + videoId;
      statusDiv.style.color = "green";
    } else {
      console.log("Invalid URL!");
      statusDiv.textContent = "Error: Please enter a valid YouTube URL.";
      statusDiv.style.color = "red";
    }
  });
});

// Helper function to extract the Video ID from a YouTube URL
function extractVideoId(urlText) {
  try {
    const urlObj = new URL(urlText);
    
    // Check if it's a standard youtube.com link (like youtube.com/watch?v=ID)
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v'); // Gets the value of the 'v' parameter
    } 
    // Check if it's a short link (like youtu.be/ID)
    else if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1); // Removes the '/' to get just the ID
    }
  } catch (error) {
    // If they typed gibberish instead of a real URL, catch the error
    return null;
  }
  return null;
}
