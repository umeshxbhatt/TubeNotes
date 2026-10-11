// TubeNotes - Obsidian Crimson Extension Logic
document.addEventListener('DOMContentLoaded', function () {
  // UI Elements - Controls
  const urlInput = document.getElementById('youtubeUrl');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const detectTabBtn = document.getElementById('detectTabBtn');
  const generateBtn = document.getElementById('generateBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  // Status & Loaders
  const statusWrapper = document.getElementById('statusWrapper');
  const statusText = document.getElementById('statusText');
  const skeletonLoader = document.getElementById('skeletonLoader');

  // Containers
  const emptyState = document.getElementById('emptyState');
  const notesView = document.getElementById('notesView');
  const notesContent = document.getElementById('notesContent');
  const notesWordCount = document.getElementById('notesWordCount');

  // Level 1: View Navigation Tabs (Notes vs Chat)
  const tabNotesBtn = document.getElementById('tabNotesBtn');
  const tabChatBtn = document.getElementById('tabChatBtn');
  const notesPane = document.getElementById('notesPane');
  const chatPane = document.getElementById('chatPane');

  // Level 1: Chat Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const chatSuggestions = document.getElementById('chatSuggestions');

  // Actions
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyDefaultIcon = copyBtn.querySelector('.default-icon');
  const copyCheckIcon = copyBtn.querySelector('.check-icon');
  const downloadBtn = document.getElementById('downloadBtn');

  // Chips
  const styleChips = document.querySelectorAll('.chip');

  // State Management
  let selectedStyle = 'bullets';
  let currentRawNotes = '';
  let currentVideoId = '';
  let currentTranscript = '';
  let chatHistory = []; // Level 1: Stores multi-turn history [{role: 'user'|'model', text: '...'}]

  // 1. Auto-detect active YouTube tab on popup launch
  autoDetectCurrentTab();

  // 2. Tab detection button click
  detectTabBtn.addEventListener('click', function () {
    autoDetectCurrentTab(true);
  });

  // 3. Input management & Clear button
  urlInput.addEventListener('input', function () {
    toggleClearButton();
  });

  clearInputBtn.addEventListener('click', function () {
    urlInput.value = '';
    toggleClearButton();
    urlInput.focus();
  });

  function toggleClearButton() {
    if (urlInput.value.trim().length > 0) {
      clearInputBtn.classList.remove('hidden');
    } else {
      clearInputBtn.classList.add('hidden');
    }
  }

  // 4. Style Chip selector
  styleChips.forEach(chip => {
    chip.addEventListener('click', function () {
      styleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedStyle = chip.dataset.style || 'bullets';
    });
  });

  // 5. Generate Notes Button
  generateBtn.addEventListener('click', async function () {
    const rawUrl = urlInput.value.trim();
    const videoId = extractVideoId(rawUrl);

    if (!videoId) {
      showStatus("Please enter a valid YouTube video link.", "error");
      return;
    }

    currentVideoId = videoId;
    setLoadingState(true, "Fetching transcript...");

    try {
      // Step A: Fetch transcript from backend
      showStatus("Extracting video captions...", "info");
      const transcript = await fetchTranscript(videoId);
      currentTranscript = transcript;
      
      // Reset Chat for new video
      chatHistory = [];
      resetChatMessages();

      // Step B: Send transcript to AI note generator
      showStatus("Synthesizing notes with Gemini AI...", "info");
      const notes = await generateAINotes(transcript, selectedStyle);

      // Step C: Render notes
      currentRawNotes = notes;
      renderNotes(notes);
      showStatus("Notes ready!", "success");

      // Switch to Notes tab by default
      switchTab('notes');

      setTimeout(() => {
        hideStatus();
      }, 3500);

    } catch (err) {
      console.error("TubeNotes Error:", err);
      showStatus(err.message || "Failed to generate notes. Check backend.", "error");
      skeletonLoader.classList.add('hidden');
      if (!currentRawNotes) {
        emptyState.classList.remove('hidden');
      }
    } finally {
      setLoadingState(false);
    }
  });

  // 6. Level 1: Tab Switching (Notes vs Chat)
  tabNotesBtn.addEventListener('click', () => switchTab('notes'));
  tabChatBtn.addEventListener('click', () => switchTab('chat'));

  function switchTab(tab) {
    if (tab === 'notes') {
      tabNotesBtn.classList.add('active');
      tabChatBtn.classList.remove('active');
      notesPane.classList.remove('hidden');
      notesPane.classList.add('active');
      chatPane.classList.add('hidden');
      chatPane.classList.remove('active');
    } else {
      tabChatBtn.classList.add('active');
      tabNotesBtn.classList.remove('active');
      chatPane.classList.remove('hidden');
      chatPane.classList.add('active');
      notesPane.classList.add('hidden');
      notesPane.classList.remove('active');
      chatInput.focus();
    }
  }

  // 7. Level 1: Conversational Chat Logic
  sendChatBtn.addEventListener('click', handleChatSubmit);
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleChatSubmit();
    }
  });

  // Handle suggested prompt chips
  if (chatSuggestions) {
    chatSuggestions.addEventListener('click', function (e) {
      const chip = e.target.closest('.suggest-chip');
      if (chip && chip.dataset.prompt) {
        chatInput.value = chip.dataset.prompt;
        handleChatSubmit();
      }
    });
  }

  async function handleChatSubmit() {
    const question = chatInput.value.trim();
    if (!question) return;

    if (!currentTranscript) {
      showStatus("Please generate notes for a video first.", "error");
      return;
    }

    // Append User Message to UI
    appendChatMessage('user', question);
    chatInput.value = '';
    chatInput.disabled = true;
    sendChatBtn.disabled = true;

    // Append temporary thinking indicator
    const thinkingRow = appendChatMessage('bot', '<em>Thinking...</em>', true);

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: currentTranscript,
          question: question,
          history: chatHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get AI response.");
      }

      const data = await response.json();
      const answer = data.answer || "No response received.";

      // Replace thinking bubble with formatted answer
      thinkingRow.remove();
      appendChatMessage('bot', answer);

      // Update state history for subsequent multi-turn context
      chatHistory.push({ role: 'user', text: question });
      chatHistory.push({ role: 'model', text: answer });

    } catch (err) {
      console.error("Chat Error:", err);
      thinkingRow.remove();
      appendChatMessage('bot', `⚠️ **Error:** ${err.message || 'Could not reach chat server.'}`);
    } finally {
      chatInput.disabled = false;
      sendChatBtn.disabled = false;
      chatInput.focus();
    }
  }

  function appendChatMessage(sender, text, isHtml = false) {
    const row = document.createElement('div');
    row.className = `chat-bubble-row ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender === 'user' ? 'user-msg' : 'bot-msg'}`;

    if (sender === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'chat-avatar';
      avatar.textContent = 'AI';
      row.appendChild(avatar);

      if (isHtml) {
        bubble.innerHTML = text;
      } else {
        bubble.innerHTML = formatMarkdown(text);
      }
    } else {
      bubble.textContent = text;
    }

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return row;
  }

  function resetChatMessages() {
    chatMessages.innerHTML = `
      <div class="chat-bubble-row bot">
        <div class="chat-avatar">AI</div>
        <div class="chat-bubble bot-msg">
          I've loaded the video transcript! Ask me anything about this video (e.g. explain a concept, give code examples, or test your understanding).
        </div>
      </div>
    `;
  }

  // 8. Copy to clipboard
  copyBtn.addEventListener('click', async function () {
    if (!currentRawNotes) return;
    try {
      await navigator.clipboard.writeText(currentRawNotes);
      copyBtn.classList.add('copied');
      copyBtnText.textContent = "Copied!";
      copyDefaultIcon.classList.add('hidden');
      copyCheckIcon.classList.remove('hidden');

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtnText.textContent = "Copy";
        copyDefaultIcon.classList.remove('hidden');
        copyCheckIcon.classList.add('hidden');
      }, 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  });

  // 9. Download / Export markdown file
  downloadBtn.addEventListener('click', function () {
    if (!currentRawNotes) return;

    const filename = `TubeNotes_${currentVideoId || 'summary'}.md`;
    const blob = new Blob([currentRawNotes], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // ---------------- Helper Functions ---------------- //

  // Auto-detect YouTube tab
  function autoDetectCurrentTab(showAlertIfNone = false) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0 && tabs[0].url) {
          const tabUrl = tabs[0].url;
          if (extractVideoId(tabUrl)) {
            urlInput.value = tabUrl;
            toggleClearButton();
            showStatus("Detected current YouTube video!", "success");
            setTimeout(hideStatus, 2500);
            return;
          }
        }
        if (showAlertIfNone) {
          showStatus("Active tab is not a YouTube video.", "error");
        }
      });
    }
  }

  // Extract YouTube ID
  function extractVideoId(urlText) {
    try {
      const urlObj = new URL(urlText);
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      } else if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
    } catch {
      return null;
    }
    return null;
  }

  // Fetch transcript from backend server
  async function fetchTranscript(videoId) {
    const response = await fetch(`http://localhost:3000/transcript?videoId=${encodeURIComponent(videoId)}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Could not fetch transcript. Video may lack captions.");
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  }

  // Call Gemini backend for note generation
  async function generateAINotes(transcript, style) {
    const response = await fetch(`http://localhost:3000/generate-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, style })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to generate notes with AI.");
    }
    const data = await response.json();
    return data.notes;
  }

  // UI state management
  function setLoadingState(isLoading, message = "") {
    if (isLoading) {
      generateBtn.disabled = true;
      btnSpinner.classList.remove('hidden');
      btnText.textContent = "Synthesizing...";
      emptyState.classList.add('hidden');
      notesView.classList.add('hidden');
      skeletonLoader.classList.remove('hidden');
      showStatus(message, "info");
    } else {
      generateBtn.disabled = false;
      btnSpinner.classList.add('hidden');
      btnText.textContent = "Generate AI Notes";
      skeletonLoader.classList.add('hidden');
    }
  }

  function showStatus(message, type = "info") {
    statusText.textContent = message;
    statusWrapper.className = `status-wrapper ${type}`;
    statusWrapper.classList.remove('hidden');
  }

  function hideStatus() {
    statusWrapper.classList.add('hidden');
  }

  // Render notes with Markdown support
  function renderNotes(markdown) {
    notesContent.innerHTML = formatMarkdown(markdown);
    
    // Word count calculation
    const words = markdown.trim().split(/\s+/).filter(Boolean).length;
    notesWordCount.textContent = `${words} words`;

    emptyState.classList.add('hidden');
    notesView.classList.remove('hidden');
  }

  // Lightweight safe Markdown to HTML parser
  function formatMarkdown(md) {
    if (!md) return '';

    // Escape HTML tags to prevent injection
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Lists (unordered)
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
    // Clean up duplicate nested <ul> tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs / double line breaks
    html = html.split(/\n\n+/).map(para => {
      para = para.trim();
      if (!para) return '';
      if (/^<(h[1-3]|ul|blockquote)/i.test(para)) {
        return para;
      }
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }
});
