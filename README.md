# 🎬 TubeNotes 📝

> **AI-Powered YouTube Study & Note-Taking Assistant** — Generate structured notes, study deep-dives, extract timestamped transcripts, and chat interactively with any YouTube video in real time.

<div align="center">

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%201.5-8E75C4?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-crimson?style=for-the-badge)](LICENSE)

[**Download Latest Release**](https://github.com/umeshxbhatt/TubeNotes/releases) • [**Report Bug**](https://github.com/umeshxbhatt/TubeNotes/issues) • [**Request Feature**](https://github.com/umeshxbhatt/TubeNotes/issues)

</div>

---

## 📽️ Demo & Screenshots

<div align="center">
  <!-- Place your demo GIF or screenshot inside an assets/ folder -->
  <img src="assets/demo.png" alt="TubeNotes Interface Demo" width="700" />
</div>

> 💡 *To add an animated demo:* Record a 15-second screen capture with `Cmd + Shift + 5`, convert it to `.gif` or `.mp4`, and place it in the `assets/` directory as `demo.gif`!

---

## ✨ Key Features

- ⚡ **Instant Tab Detection:** Automatically grabs the YouTube URL and video metadata from your active browser tab with one click.
- 🧠 **AI-Powered Note Generation:** Uses **Google Gemini 1.5 Flash** to analyze full transcripts and generate:
  - **Quick Summary:** Crisp, high-level overviews with key takeaways.
  - **Deep-Dive Study Notes:** Comprehensive concept breakdowns, definitions, and chapter-wise points.
- 💬 **Interactive Chat Companion:** Ask specific questions about the video and get instant, grounded answers anchored directly to the transcript context with conversational memory.
- 🌐 **Multilingual & Hinglish Support:** Ask questions in English, Hindi, Hinglish, Spanish, or French and receive natural, readable responses.
- 📜 **Smart Transcript Extractor:** 
  - Scrapes raw caption streams via YouTube's InnerTube API.
  - Automatically isolates native/original creator audio tracks and filters out automated dubs and machine translations.
  - Formats transcripts into timestamped, readable paragraph chunks.
- 📋 **1-Click Copy & Export:** Copy formatted markdown or download plain text files directly to your machine.
- ⌨️ **Keyboard Shortcut:** Toggle TubeNotes anywhere on YouTube using `Command + Shift + Y` (Mac) or `Ctrl + Shift + Y` (Windows/Linux).
- 🎨 **Obsidian Crimson Theme:** Modern, sleek dark-mode interface built for long study sessions.

---

## 🏗️ Architecture

```mermaid
graph LR
    YT[YouTube Tab] -->|Detect Active Tab| EXT[TubeNotes Chrome Extension<br/>(Manifest V3)]
    EXT -->|REST API Requests| BE[Express.js Backend Server]
    BE -->|InnerTube / YouTube-Transcript| YTI[YouTube Caption Engine]
    BE -->|Prompt + Grounded Transcript| GEM[Google Gemini 1.5 API]
    GEM -->|Structured Notes & Chat| BE
    BE -->|JSON Response| EXT
```

---

## 🚀 Installation & Quick Start

### For End Users & Testers (Install in 60 Seconds)

1. **Download the latest release**: Grab `TubeNotes.zip` from the [Releases](https://github.com/umeshxbhatt/TubeNotes/releases) page.
2. **Extract** the zip file to a folder on your computer.
3. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click **Load unpacked** in the top-left corner and select the `extension` folder.
6. Open any YouTube video and click the **TubeNotes** icon in your Chrome toolbar (or press `Cmd+Shift+Y`)!

---

### For Developers (Local Setup)

#### 1. Clone the repository
```bash
git clone https://github.com/umeshxbhatt/TubeNotes.git
cd TubeNotes
```

#### 2. Set up Backend & Environment Variables
Navigate to the `backend/` directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the project root (`/TubeNotes/.env`):
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
PORT=3000
```
> 🔑 Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).

Start the local server:
```bash
node server.js
```
The server will boot on `http://localhost:3000`.

#### 3. Load the Extension into Chrome
1. Go to `chrome://extensions/`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose the `extension/` directory.

---

## 📂 Repository Structure

```text
TubeNotes/
├── backend/
│   ├── package.json          # Express server dependencies
│   └── server.js             # API routes (/transcript, /generate-notes, /chat)
├── extension/
│   ├── manifest.json         # Chrome MV3 manifest configuration
│   ├── popup.html            # Extension popup layout (Notes, Chat, Transcripts)
│   ├── popup.js              # Client-side UI logic, API calls, event handlers
│   ├── rules.json            # Declarative net request rules
│   └── styles/
│       └── popup.css         # Obsidian Crimson design system & animations
├── .env                      # API keys & environment configs (git-ignored)
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

The backend exposes three lightweight REST endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/transcript?videoId={id}&lang={code}` | Fetches and formats native caption tracks with timestamps |
| `POST` | `/generate-notes` | Generates summary or detailed study notes via Gemini API |
| `POST` | `/chat` | Handles multi-turn chat grounded in the video transcript |

---

## 🗺️ Roadmap

- [ ] One-click export to **Notion** and **Obsidian** vaults
- [ ] Free cloud deployment for backend (Render / Fly.io) so users don't need a local Node.js server
- [ ] Video timestamp hyperlinking (click note timestamp to jump directly in the YouTube player)
- [ ] Support for playlist batch summarization

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/umeshxbhatt/TubeNotes/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
