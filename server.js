import express from "express";
import cors from "cors";
import { YoutubeTranscript } from 'youtube-transcript';

const app = express(); // Initialize the server app
const PORT = 3000;

// Enable CORS so our Chrome Extension can communicate with this server
app.use(cors());

// Create an endpoint at http://localhost:3000/transcript
app.get('/transcript', async (req, res) => {
  const videoId = req.query.videoId;

  if (!videoId) {
    return res.status(400).json({ error: 'Please provide a videoId' });
  }

  try {
    console.log(`Fetching transcript for video: ${videoId}`);
    // Fetch the transcript using the npm package (which bypasses browser limits)
    const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Combine all the text blocks into one massive string
    const fullText = transcriptArray.map(item => item.text).join(' ');

    res.json({ text: fullText });
  } catch (error) {
    console.error(`Error fetching transcript:`, error.message);
    res.status(500).json({ error: 'Failed to fetch transcript. The video might not have captions.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ TubeNotes Backend is running on http://localhost:${PORT}`);
  console.log(`Waiting for requests from your Chrome Extension...`);
});
