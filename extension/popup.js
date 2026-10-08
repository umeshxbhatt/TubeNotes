document.addEventListener('DOMContentLoaded', function () {
  // 1. Grab the HTML elements we need using their IDs
  const generateBtn = document.getElementById('generateBtn');
  const urlInput = document.getElementById('youtubeUrl');
  const statusDiv = document.getElementById('status');
  const notesOutput = document.getElementById('notesOutput'); // <-- NEW: Grab our new text box
  const downloadBtn = document.getElementById('downloadBtn'); // Grab the download button

  // --- NEW: Auto-detect YouTube URL ---
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    // Check if we are currently on a YouTube video page
    if (currentTab && currentTab.url && currentTab.url.includes("youtube.com/watch")) {
      urlInput.value = currentTab.url; // Automatically fill the input box!
    }
  });

  // --- FIXED: Press 'Enter' anywhere to generate ---
  document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      generateBtn.click(); // Simulates clicking the generate button
    }
  });

  // 2. Listen for a 'click' event on our button
  generateBtn.addEventListener('click', async function () {

    // 3. Get the text the user typed into the input field
    const url = urlInput.value;

    // 4. Extract the Video ID
    const videoId = extractVideoId(url);

    if (videoId) {
      console.log("Success! Video ID is:", videoId);
      statusDiv.textContent = "Fetching transcript... Please wait.";
      statusDiv.style.color = "blue";

      try {
        const transcriptText = await fetchTranscript(videoId);
        console.log("Transcript fetched successfully!");
        statusDiv.textContent = "Transcript ready! Generating notes using AI... (this might take a few seconds)";
        statusDiv.style.color = "orange";

        // --- NEW STEP: Send to Gemini ---
        const notes = await generateNotes(transcriptText);
        console.log("AI Notes Generated:", notes);

        // --- NEW STEP: Display in the UI ---
        notesOutput.value = notes;       // Put the text inside the box
        notesOutput.style.display = "block"; // Make the box visible
        downloadBtn.style.display = "block"; // Make the download button visible
        
        statusDiv.textContent = "Notes generated successfully!";
        statusDiv.style.color = "green";
        // --------------------------------

      } catch (error) {
        console.error(error);
        statusDiv.textContent = "Error: Something went wrong.";
        statusDiv.style.color = "red";
      }

    } else {
      console.log("Invalid URL!");
      statusDiv.textContent = "Error: Please enter a valid YouTube URL.";
      statusDiv.style.color = "red";
    }
  });

  // --- NEW STEP: Download Logic ---
  downloadBtn.addEventListener('click', function () {
    // 1. Get the text from the text area
    const textToSave = notesOutput.value;

    // 2. Create a "Blob" (a file-like object) containing the text
    const blob = new Blob([textToSave], { type: 'text/markdown' });

    // 3. Create a temporary URL for that Blob
    const url = URL.createObjectURL(blob);

    // 4. Use Chrome's download API to save it to the user's computer
    chrome.downloads.download({
      url: url,
      filename: `TubeNotes-${Date.now()}.md`, // Give it a unique filename
      saveAs: true // Ask the user where to save it
    });
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

// Helper function to fetch the transcript using our new Backend Server
async function fetchTranscript(videoId) {
  // We send a request to our local server instead of YouTube
  const response = await fetch(`http://localhost:3000/transcript?videoId=${videoId}`);

  if (!response.ok) {
    throw new Error("Backend server returned an error.");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.text;
}

// --- UPDATED FUNCTION: Ask our backend server to generate notes ---
async function generateNotes(transcript) {
  // We send a POST request to our local server
  const response = await fetch('http://localhost:3000/generate-notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    // We send the transcript in the body of the request
    body: JSON.stringify({ transcript: transcript })
  });

  if (!response.ok) {
    throw new Error("Failed to get notes from backend server.");
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data.notes;
}
