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

// Helpers to decode entities and parse transcript XML
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function formatTimestamp(seconds) {
  const totalSec = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseTranscriptXml(xml) {
  const segments = [];
  // Try srv3 format (<p t="ms">)
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(match[1], 10);
    let text = match[3].replace(/<[^>]+>/g, '');
    text = decodeEntities(text).trim();
    if (text) {
      segments.push({
        offset: startMs / 1000,
        text
      });
    }
  }
  if (segments.length > 0) return segments;

  // Fall back to classic format (<text start="sec">)
  const textRegex = /<text\s+start="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  while ((match = textRegex.exec(xml)) !== null) {
    const offsetSec = parseFloat(match[1]);
    const text = decodeEntities(match[2]).trim();
    if (text) {
      segments.push({
        offset: offsetSec,
        text
      });
    }
  }
  return segments;
}

// Groups micro caption segments into readable timestamped paragraphs (~25-30s blocks)
function structureSegmentsIntoParagraphs(segments) {
  if (!segments || segments.length === 0) {
    return { plainText: '', formattedText: '', blocks: [] };
  }

  const blocks = [];
  let currentBlock = {
    start: segments[0].offset || 0,
    timestamp: formatTimestamp(segments[0].offset || 0),
    texts: []
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentBlock.texts.push(seg.text);

    const elapsed = (seg.offset || 0) - currentBlock.start;
    const wordCount = currentBlock.texts.join(' ').split(/\s+/).length;

    // Break into next block after ~25 seconds elapsed or ~40 words
    if ((elapsed >= 25 || wordCount >= 40) && i < segments.length - 1) {
      blocks.push({
        start: currentBlock.start,
        timestamp: currentBlock.timestamp,
        text: currentBlock.texts.join(' ')
      });
      currentBlock = {
        start: segments[i + 1].offset || 0,
        timestamp: formatTimestamp(segments[i + 1].offset || 0),
        texts: []
      };
    }
  }

  if (currentBlock.texts.length > 0) {
    blocks.push({
      start: currentBlock.start,
      timestamp: currentBlock.timestamp,
      text: currentBlock.texts.join(' ')
    });
  }

  const plainText = segments.map(s => s.text).join(' ');
  const formattedText = blocks.map(b => `[${b.timestamp}] ${b.text}`).join('\n\n');

  return { plainText, formattedText, blocks };
}

// Smart Caption Track Selector: Prioritizes the true ORIGINAL video language
// Strictly filters out auto-dubbed, localized dub, or auto-translated tracks
function selectOriginalCaptionTrack(captionsRenderer, requestedLang, playerData) {
  const captionTracks = captionsRenderer?.captionTracks;
  if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
    return null;
  }

  console.log(`📋 Found ${captionTracks.length} caption track(s):`);
  captionTracks.forEach((t, i) => {
    const label = t.name?.simpleText || t.name?.runs?.[0]?.text || t.languageCode;
    console.log(`   [${i}] lang: ${t.languageCode}, label: "${label}", vssId: ${t.vssId}, type: ${t.audioTrackType || 'none'}`);
  });

  // If user explicitly requested a language ISO code (e.g. 'en', 'hi', 'es')
  if (requestedLang) {
    const directMatch = captionTracks.find(t => t.languageCode?.toLowerCase() === requestedLang.toLowerCase() && !t.baseUrl.includes('&tlang='));
    if (directMatch) return directMatch;
    const fallbackMatch = captionTracks.find(t => t.languageCode?.toLowerCase() === requestedLang.toLowerCase());
    if (fallbackMatch) return fallbackMatch;
  }

  const audioTracks = captionsRenderer?.audioTracks;
  const defaultAudioTrackIndex = captionsRenderer?.defaultAudioTrackIndex;

  const getTrackName = (t) => {
    return (t?.name?.simpleText || t?.name?.runs?.[0]?.text || '').toLowerCase();
  };

  const isDubbed = (t) => {
    const name = getTrackName(t);
    const isDubType = t?.audioTrackType === 'AUDIO_TRACK_TYPE_DUBBED';
    const hasDubWord = name.includes('auto-dub') || name.includes('dubbed') || name.includes('dub') || name.includes('डब');
    return isDubType || hasDubWord;
  };

  const isExplicitlyOriginal = (t) => {
    const name = getTrackName(t);
    return name.includes('(original)') || name.includes('original') || t?.audioTrackType === 'AUDIO_TRACK_TYPE_PRIMARY';
  };

  // Priority 1: Caption track explicitly designated as "Original" or "PRIMARY" (and not auto-translated)
  const explicitlyOriginal = captionTracks.find(t => isExplicitlyOriginal(t) && !t.baseUrl.includes('&tlang='));
  if (explicitlyOriginal) {
    console.log(`🎯 [P1] Selected explicitly original track: "${getTrackName(explicitlyOriginal)}" (${explicitlyOriginal.languageCode})`);
    return explicitlyOriginal;
  }

  // Priority 2: Use defaultAudioTrackIndex mapping from audioTracks
  if (Array.isArray(audioTracks) && typeof defaultAudioTrackIndex === 'number' && audioTracks[defaultAudioTrackIndex]) {
    const defaultAudio = audioTracks[defaultAudioTrackIndex];
    console.log(`🎧 Default audio track [${defaultAudioTrackIndex}]:`, defaultAudio.audioTrackId || 'unnamed');
    const candidateIndices = defaultAudio.captionTrackIndices;
    if (Array.isArray(candidateIndices) && candidateIndices.length > 0) {
      const mappedTracks = candidateIndices.map(idx => captionTracks[idx]).filter(Boolean);
      const originalMapped = mappedTracks.find(t => !isDubbed(t) && !t.baseUrl.includes('&tlang='));
      if (originalMapped) {
        console.log(`🎯 [P2] Selected track via defaultAudioTrackIndex: "${getTrackName(originalMapped)}" (${originalMapped.languageCode})`);
        return originalMapped;
      }
    }
  }

  // Priority 3: Match video defaultLanguage from metadata (e.g. videoDetails or microformat)
  const videoDefaultLang = (
    playerData?.videoDetails?.defaultAudioLanguage ||
    playerData?.videoDetails?.defaultLanguage ||
    playerData?.microformat?.playerMicroformatRenderer?.defaultLanguage
  )?.toLowerCase();

  if (videoDefaultLang) {
    console.log(`🌐 Video metadata default language: ${videoDefaultLang}`);
    const defaultLangTrack = captionTracks.find(t => 
      t.languageCode?.toLowerCase() === videoDefaultLang && 
      !isDubbed(t) && 
      !t.baseUrl.includes('&tlang=')
    );
    if (defaultLangTrack) {
      console.log(`🎯 [P3] Selected track matching video defaultLanguage: "${getTrackName(defaultLangTrack)}" (${defaultLangTrack.languageCode})`);
      return defaultLangTrack;
    }
  }

  // Priority 4: Creator-uploaded manual caption track (vssId starts with '.' instead of 'a.') that is not dubbed
  const manualTrack = captionTracks.find(t => 
    t.vssId && !t.vssId.startsWith('a.') && 
    !isDubbed(t) && 
    !t.baseUrl.includes('&tlang=')
  );
  if (manualTrack) {
    console.log(`🎯 [P4] Selected creator manual track: "${getTrackName(manualTrack)}" (${manualTrack.languageCode})`);
    return manualTrack;
  }

  // Priority 5: Any native track that is NOT dubbed and NOT auto-translated
  const nonDubbedNativeTracks = captionTracks.filter(t => !isDubbed(t) && !t.baseUrl.includes('&tlang='));
  if (nonDubbedNativeTracks.length > 0) {
    console.log(`🎯 [P5] Selected non-dubbed native track: "${getTrackName(nonDubbedNativeTracks[0])}" (${nonDubbedNativeTracks[0].languageCode})`);
    return nonDubbedNativeTracks[0];
  }

  // Priority 6: Any non-auto-translated track
  const nonTlang = captionTracks.find(t => !t.baseUrl.includes('&tlang='));
  if (nonTlang) {
    console.log(`🎯 [P6] Selected non-auto-translated track: "${getTrackName(nonTlang)}" (${nonTlang.languageCode})`);
    return nonTlang;
  }

  console.log(`🎯 [P7] Fallback to first available track: "${getTrackName(captionTracks[0])}" (${captionTracks[0].languageCode})`);
  return captionTracks[0];
}

// Create an endpoint at http://localhost:3000/transcript
// Prioritizes the video's original/native language captions (skips auto-dubs & auto-translations)
app.get('/transcript', async (req, res) => {
  const { videoId, lang } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'Please provide a videoId' });
  }

  try {
    console.log(`\n========================================`);
    console.log(`Fetching transcript for video: ${videoId} (requested lang: ${lang || 'original'})`);

    const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
    const INNERTUBE_CLIENT_VERSION = '20.10.38';
    const INNERTUBE_CONTEXT = {
      client: {
        clientName: 'ANDROID',
        clientVersion: INNERTUBE_CLIENT_VERSION,
        hl: 'en',
      },
    };
    const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

    let rawSegments = [];
    let detectedLang = 'en';
    let trackLabel = '';

    try {
      const playerResp = await fetch(INNERTUBE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': INNERTUBE_USER_AGENT,
        },
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          videoId: videoId,
        }),
      });

      if (playerResp.ok) {
        const playerData = await playerResp.json();
        const captionsRenderer = playerData?.captions?.playerCaptionsTracklistRenderer;
        const captionTracks = captionsRenderer?.captionTracks;

        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          const chosenTrack = selectOriginalCaptionTrack(captionsRenderer, lang, playerData);

          if (chosenTrack) {
            detectedLang = chosenTrack.languageCode || 'unknown';
            trackLabel = chosenTrack.name?.simpleText || chosenTrack.name?.runs?.[0]?.text || detectedLang;
            console.log(`✅ Using original caption track: "${trackLabel}" (${detectedLang})`);

            const xmlResp = await fetch(chosenTrack.baseUrl, {
              headers: { 'User-Agent': INNERTUBE_USER_AGENT }
            });

            if (xmlResp.ok) {
              const xml = await xmlResp.text();
              rawSegments = parseTranscriptXml(xml);
            }
          }
        }
      }
    } catch (innerErr) {
      console.warn("Direct InnerTube transcript fetch failed, trying npm fallback:", innerErr.message);
    }

    // Fallback using youtube-transcript package if direct fetch did not populate segments
    if (!rawSegments || rawSegments.length === 0) {
      console.log("Using youtube-transcript package fallback...");
      const targetLang = lang || (detectedLang !== 'unknown' ? detectedLang : undefined);
      const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId, targetLang ? { lang: targetLang } : undefined);
      rawSegments = transcriptArray.map(item => ({
        offset: item.offset > 1000 ? item.offset / 1000 : (item.offset || 0),
        text: item.text
      }));
      if (!trackLabel && transcriptArray.length > 0) {
        trackLabel = targetLang || 'original';
      }
    }

    if (!rawSegments || rawSegments.length === 0) {
      throw new Error("No caption text found for this video.");
    }

    // Structure segments into clean timestamped paragraph blocks
    const { plainText, formattedText, blocks } = structureSegmentsIntoParagraphs(rawSegments);

    res.json({
      text: plainText,
      formattedText: formattedText,
      blocks: blocks,
      language: detectedLang,
      languageLabel: trackLabel || detectedLang
    });
  } catch (error) {
    console.error(`Error fetching transcript:`, error.message);
    res.status(500).json({ error: 'Failed to fetch transcript. The video might not have captions.' });
  }
});

// Create an endpoint to handle AI Note Generation
app.post('/generate-notes', async (req, res) => {
  const { transcript, style = 'summary', customPrompt = '' } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Please provide a transcript' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not found in .env file on the server.' });
  }

  let styleInstruction = "Create a crisp Quick Summary: 2 concise paragraphs covering the core topic, followed by 3 key bullet points.";
  if (style === 'notes' || style === 'deep-dive') {
    styleInstruction = "Create comprehensive, exhaustive study notes with clear bold headings, in-depth concept breakdown, important quotes, and actionable takeaways.";
  }

  // Language & Custom Focus handling
  const cleanPrompt = (customPrompt || '').trim();
  const isHinglish = /hinglish|hindi/i.test(cleanPrompt);

  let languageInstruction = "Write ALL notes strictly in fluent, clear English.";
  if (isHinglish) {
    languageInstruction = "Write ALL notes strictly in natural, conversational Hinglish (Hindi written using the English/Roman alphabet, e.g. 'Is video ka main topic ye hai ki...', keeping all technical terms in standard English). DO NOT use Devanagari Hindi script.";
  } else if (/spanish|español/i.test(cleanPrompt)) {
    languageInstruction = "Write ALL notes strictly in fluent, professional Spanish.";
  } else if (/french|français/i.test(cleanPrompt)) {
    languageInstruction = "Write ALL notes strictly in fluent, professional French.";
  }

  let customFocusBlock = "";
  if (cleanPrompt) {
    customFocusBlock = `
      SPECIAL USER INSTRUCTIONS / CUSTOM FOCUS:
      The user explicitly requested: "${cleanPrompt}".
      You MUST strictly prioritize and incorporate these user instructions into the final output.
    `;
  }

  try {
    console.log(`Generating AI notes (style: ${style}, customPrompt: "${cleanPrompt}")...`);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const promptText = `
      You are an expert note-taker. I will give you a video transcript.
      
      LANGUAGE INSTRUCTION:
      ${languageInstruction}

      BASE STYLE & FORMATTING:
      ${styleInstruction}
      Use clean Markdown formatting (Headings, bullet points, bold text).
      ${customFocusBlock}

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
1. Respond naturally in the SAME language that the user writes in. If the user writes or asks in Hindi or Hinglish, ALWAYS respond in natural, easy-to-read Hinglish (Roman/English script, e.g. "Is video mein main point ye hai ki..."), NEVER in Devanagari Hindi script. If asked in English, reply in English.
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
