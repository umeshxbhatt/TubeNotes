import express from "express";
import cors from "cors";
import { YoutubeTranscript } from 'youtube-transcript';
import dotenv from "dotenv";

dotenv.config({ path: '../.env' }); // Load the .env file from the parent folder

const app = express(); // Initialize the server app
const PORT = 3000;

// Middleware to parse JSON bodies from our extension
app.use(express.json());

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

// Create an endpoint to handle AI Note Generation
app.post('/generate-notes', async (req, res) => {
  const transcript = req.body.transcript;

  if (!transcript) {
    return res.status(400).json({ error: 'Please provide a transcript' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not found in .env file on the server.' });
  }

  try {
    console.log("Generating AI notes...");
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const promptText = `
      You are an expert note-taker. I will give you a video transcript.
      Please create well-structured, comprehensive notes in english language from it.
      Use Markdown formatting (Headings, bullet points, bold text).
      
      Here is the transcript:
      ${transcript}
    `;

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    };

    const response = await fetch(apiUrl, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error details:", errorData);
      throw new Error(`Failed to generate notes from Gemini API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    console.log("Notes generated successfully!");
    res.json({ notes: generatedText });

  } catch (error) {
    console.error("Error generating notes:", error.message);
    res.status(500).json({ error: 'Failed to generate notes using AI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ TubeNotes Backend is running on http://localhost:${PORT}`);
  console.log(`Waiting for requests from your Chrome Extension...`);
});
