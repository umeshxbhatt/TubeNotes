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

  const style = req.body.style || 'bullets';

  let styleInstruction = "Create comprehensive key takeaways organized with clear headings and actionable bullet points.";
  if (style === 'summary') {
    styleInstruction = "Create a concise executive summary in 2-3 structured paragraphs highlighting the core idea and main conclusions.";
  } else if (style === 'deep-dive') {
    styleInstruction = "Create an exhaustive in-depth breakdown covering context, step-by-step concepts, key quotes, actionable insights, and critical takeaways.";
  }

  try {
    console.log(`Generating AI notes with style: ${style}...`);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const promptText = `
      You are an expert note-taker. I will give you a video transcript.
      
      CRITICAL LANGUAGE REQUIREMENT:
      Regardless of the original language of the video or transcript (e.g. Hindi, Hinglish, Spanish, French, German, Japanese, etc.), you MUST generate and write ALL notes strictly and entirely in fluent, professional English. Do not respond in any other language.

      STYLE & FORMATTING:
      ${styleInstruction}
      Use clean Markdown formatting (Headings, bullet points, bold text).
      
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

// Level 1: Conversational AI & Context ("Chat with Video")
app.post('/chat', async (req, res) => {
  const { transcript, question, history = [] } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Please provide a question.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not found in .env file on the server.' });
  }

  try {
    console.log(`Processing chat question: "${question}"`);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 1. System Instruction: defines persona, rules, and video transcript context
    const systemInstruction = {
      parts: [
        {
          text: `You are TubeNotes AI, a helpful and sharp study companion for this YouTube video.
Your job is to answer the user's questions about the video accurately, clearly, and concisely.

CRITICAL RULES:
1. Always respond in fluent, clear English.
2. Anchor your answers directly to the video transcript provided below.
3. If the user asks something not mentioned in the video, politely state that the video doesn't cover it, but offer a brief general explanation.
4. Format your responses with clean Markdown (bullet points, bold text, code blocks where appropriate).

VIDEO TRANSCRIPT:
${transcript || "No transcript available."}`
        }
      ]
    };

    // 2. Format history into Gemini's multi-turn schema [{role: "user"|"model", parts: [{text}]}]
    const formattedContents = history.map(item => ({
      role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.text }]
    }));

    // 3. Add the latest user question to the end of the history
    formattedContents.push({
      role: 'user',
      parts: [{ text: question }]
    });

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents: formattedContents
      })
    };

    const response = await fetch(apiUrl, requestOptions);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini Chat API Error:", errorData);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I could not generate an answer.";

    res.json({ answer: replyText });

  } catch (error) {
    console.error("Error in /chat endpoint:", error.message);
    res.status(500).json({ error: 'Failed to process chat response.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ TubeNotes Backend is running on http://localhost:${PORT}`);
  console.log(`Waiting for requests from your Chrome Extension...`);
});
