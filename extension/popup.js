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

  // View Navigation Tabs
  const tabNotesBtn = document.getElementById('tabNotesBtn');
  const tabChatBtn = document.getElementById('tabChatBtn');
  const tabTranscriptBtn = document.getElementById('tabTranscriptBtn');
  const clearVideoDataBtn = document.getElementById('clearVideoDataBtn');

  // Panes
  const notesPane = document.getElementById('notesPane');
  const chatPane = document.getElementById('chatPane');
  const transcriptPane = document.getElementById('transcriptPane');

  // Chat Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const chatSuggestions = document.getElementById('chatSuggestions');

  // Transcript Elements
  const transcriptContent = document.getElementById('transcriptContent');
  const transcriptWordCount = document.getElementById('transcriptWordCount');
  const transcriptLangBadge = document.getElementById('transcriptLangBadge');
  const copyTranscriptBtn = document.getElementById('copyTranscriptBtn');
  const copyTranscriptBtnText = document.getElementById('copyTranscriptBtnText');
  const downloadTranscriptBtn = document.getElementById('downloadTranscriptBtn');

  // Notes Action Buttons
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyDefaultIcon = copyBtn.querySelector('.default-icon');
  const copyCheckIcon = copyBtn.querySelector('.check-icon');
  const downloadBtn = document.getElementById('downloadBtn');

  // Style Chips & Language
  const styleChips = document.querySelectorAll('.chip');
  const notesLangSelect = document.getElementById('notesLangSelect');

  // Fast Transcript Button
  const fetchTranscriptOnlyBtn = document.getElementById('fetchTranscriptOnlyBtn');
  const transcriptBtnText = document.getElementById('transcriptBtnText');
  const transcriptSpinner = document.getElementById('transcriptSpinner');

  // State Management - Separate slots for Quick Summary & Notes
  let selectedStyle = 'summary'; // 'summary' | 'notes'
  let selectedNotesLang = 'en';  // 'en' | 'original' | 'hi' | 'hinglish' | 'es' | etc.
  let currentSummaryNotes = '';  // Slot A: Quick Summary
  let currentDetailedNotes = ''; // Slot B: Detailed Notes
  let currentVideoId = '';
  let currentTranscript = '';
  let currentFormattedTranscript = ''; // Text with [00:00] timestamps for copy & export
  let currentTranscriptBlocks = [];     // Structured array for UI badges
  let currentTranscriptLang = '';       // Detected original language label
  let chatHistory = []; // Unified chat history for the video

  // 1. Auto-detect active YouTube tab on popup launch
  autoDetectCurrentTab();

  // 2. Tab detection button click
  detectTabBtn.addEventListener('click', function () {
    autoDetectCurrentTab(true);
  });

  // 3. Input management & Clear button
  urlInput.addEventListener('input', function () {
    toggleClearButton();
    const vid = extractVideoId(urlInput.value.trim());
    if (vid && vid !== currentVideoId) {
      checkAndRestoreSavedVideo(vid);
    }
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

  // 4. Style Chip selector: toggles active style, displays notes & switches to Notes tab
  styleChips.forEach(chip => {
    chip.addEventListener('click', function () {
      styleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedStyle = chip.dataset.style || 'summary';
      
      // Update top button text
      updateGenerateButtonText();

      // If video content is loaded or notesView is active, open the Notes tab!
      if (!notesView.classList.contains('hidden') || currentSummaryNotes || currentDetailedNotes || currentTranscript) {
        emptyState.classList.add('hidden');
        notesView.classList.remove('hidden');
        displayCurrentStyleNotes();
        switchTab('notes');
      }
    });
  });

  function setChipActive(styleName) {
    styleChips.forEach(c => {
      if (c.dataset.style === styleName) {
        c.classList.add('active');
        selectedStyle = styleName;
      } else {
        c.classList.remove('active');
      }
    });
    updateGenerateButtonText();
  }

  function updateGenerateButtonText() {
    const isSummary = selectedStyle === 'summary';
    btnText.textContent = isSummary ? "Generate Summary" : "Generate Notes";
  }

  // Language selector change listener
  if (notesLangSelect) {
    notesLangSelect.addEventListener('change', function () {
      selectedNotesLang = notesLangSelect.value;
    });
  }

  // Display notes for whichever style chip is currently active
  function displayCurrentStyleNotes() {
    const isSummary = selectedStyle === 'summary';
    const activeNotes = isSummary ? currentSummaryNotes : currentDetailedNotes;
    const styleTitle = isSummary ? "Quick Summary" : "Detailed Notes";

    updateGenerateButtonText();

    if (activeNotes && activeNotes.trim().length > 0) {
      renderNotes(activeNotes);
    } else {
      // Notes for this style have not been generated yet
      notesWordCount.textContent = "0 words";

      // Modern dark aesthetic SVG icons
      const heroIconSvg = isSummary
        ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
             <polyline points="14 2 14 8 20 8"/>
             <line x1="16" y1="13" x2="8" y2="13"/>
             <line x1="16" y1="17" x2="8" y2="17"/>
           </svg>`;

      const btnIconSvg = isSummary
        ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
             <polyline points="14 2 14 8 20 8"/>
             <line x1="16" y1="13" x2="8" y2="13"/>
             <line x1="16" y1="17" x2="8" y2="17"/>
           </svg>`;

      notesContent.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: #9ca3af;">
          <div style="margin: 0 auto 12px; width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 0, 51, 0.08); border: 1px solid rgba(255, 0, 51, 0.2); display: flex; align-items: center; justify-content: center; color: var(--crimson-primary); box-shadow: 0 0 16px rgba(255, 0, 51, 0.15);">
            ${heroIconSvg}
          </div>
          <p style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 6px;">No ${styleTitle} Yet</p>
          <p style="font-size: 11.5px; color: #6b7280; margin-bottom: 18px; max-width: 260px; margin-left: auto; margin-right: auto; line-height: 1.5;">
            ${isSummary 
              ? 'Want a fast 30-second overview? Click below to generate your Quick Summary.' 
              : 'Want in-depth structured study notes? Click below to generate Detailed Notes.'}
          </p>
          <button id="inlineGenerateStyleBtn" class="action-btn primary-btn" style="margin: 0 auto; max-width: 220px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;">
            ${btnIconSvg}
            <span>Generate ${styleTitle}</span>
          </button>
        </div>
      `;

      const inlineBtn = document.getElementById('inlineGenerateStyleBtn');
      if (inlineBtn) {
        inlineBtn.addEventListener('click', () => generateBtn.click());
      }
    }
  }

  // 5A. Fast Action: View Transcript Only (Instant, 0 AI tokens)
  if (fetchTranscriptOnlyBtn) {
    fetchTranscriptOnlyBtn.addEventListener('click', async function () {
      const rawUrl = urlInput.value.trim();
      const videoId = extractVideoId(rawUrl);

      if (!videoId) {
        showStatus("Please enter a valid YouTube video link.", "error");
        return;
      }

      // If already fetched for this video, immediately switch to transcript tab without re-fetching!
      if (currentTranscript && currentVideoId === videoId) {
        emptyState.classList.add('hidden');
        notesView.classList.remove('hidden');
        switchTab('transcript');
        return;
      }

      currentVideoId = videoId;
      fetchTranscriptOnlyBtn.disabled = true;
      if (transcriptSpinner) transcriptSpinner.classList.remove('hidden');
      if (transcriptBtnText) transcriptBtnText.textContent = "Loading...";
      showStatus("Extracting original video transcript...", "info");

      try {
        const transcriptData = await fetchTranscript(videoId);
        renderTranscript(transcriptData);

        // Display current style state in notes view
        displayCurrentStyleNotes();

        // Save to storage so it persists
        await saveVideoData(videoId, {
          videoId: videoId,
          url: rawUrl,
          summaryNotes: currentSummaryNotes,
          detailedNotes: currentDetailedNotes,
          style: selectedStyle,
          transcript: currentTranscript,
          formattedTranscript: currentFormattedTranscript,
          transcriptBlocks: currentTranscriptBlocks,
          transcriptLang: currentTranscriptLang,
          chatHistory: chatHistory,
          savedAt: Date.now()
        });

        emptyState.classList.add('hidden');
        notesView.classList.remove('hidden');
        switchTab('transcript');
        showStatus("Transcript loaded with timestamps!", "success");
        setTimeout(hideStatus, 2500);

      } catch (err) {
        console.error("Transcript Fetch Error:", err);
        showStatus(err.message || "Failed to fetch transcript. Captions may be disabled.", "error");
      } finally {
        fetchTranscriptOnlyBtn.disabled = false;
        if (transcriptSpinner) transcriptSpinner.classList.add('hidden');
        if (transcriptBtnText) transcriptBtnText.textContent = "Transcript";
      }
    });
  }

  // 5B. Primary Action: Generate AI Notes Button
  generateBtn.addEventListener('click', async function () {
    const rawUrl = urlInput.value.trim();
    const videoId = extractVideoId(rawUrl);

    if (!videoId) {
      showStatus("Please enter a valid YouTube video link.", "error");
      return;
    }

    currentVideoId = videoId;
    const isSummary = selectedStyle === 'summary';
    const styleLabel = isSummary ? "Quick Summary" : "Detailed Notes";

    setLoadingState(true, `Preparing ${styleLabel}...`);

    try {
      // Step A: Fetch transcript only if we don't already have it
      if (!currentTranscript) {
        showStatus("Extracting video captions...", "info");
        const transcriptData = await fetchTranscript(videoId);
        renderTranscript(transcriptData);
      }

      // Step B: Send transcript to AI note generator for the selected style & language
      showStatus(`Synthesizing ${styleLabel} with Gemini AI...`, "info");
      const generatedNotes = await generateAINotes(currentTranscript, selectedStyle, selectedNotesLang);

      // Step C: Save into the appropriate style slot
      if (isSummary) {
        currentSummaryNotes = generatedNotes;
      } else {
        currentDetailedNotes = generatedNotes;
      }

      // Display the newly generated notes
      displayCurrentStyleNotes();

      // Step D: Save complete video state to persistent storage
      await saveVideoData(videoId, {
        videoId: videoId,
        url: rawUrl,
        summaryNotes: currentSummaryNotes,
        detailedNotes: currentDetailedNotes,
        style: selectedStyle,
        notesLanguage: selectedNotesLang,
        transcript: currentTranscript,
        formattedTranscript: currentFormattedTranscript,
        transcriptBlocks: currentTranscriptBlocks,
        transcriptLang: currentTranscriptLang,
        chatHistory: chatHistory,
        savedAt: Date.now()
      });

      showStatus(`${styleLabel} ready & saved!`, "success");
      emptyState.classList.add('hidden');
      notesView.classList.remove('hidden');
      switchTab('notes');

      setTimeout(() => {
        hideStatus();
      }, 3500);

    } catch (err) {
      console.error("TubeNotes Error:", err);
      showStatus(err.message || "Failed to generate notes. Check backend.", "error");
      skeletonLoader.classList.add('hidden');
      if (!currentSummaryNotes && !currentDetailedNotes && !currentTranscript) {
        emptyState.classList.remove('hidden');
      }
    } finally {
      setLoadingState(false);
    }
  });

  // 6. View Navigation Tabs (Notes vs Chat vs Transcript)
  tabNotesBtn.addEventListener('click', () => switchTab('notes'));
  tabChatBtn.addEventListener('click', () => switchTab('chat'));
  tabTranscriptBtn.addEventListener('click', () => switchTab('transcript'));

  function switchTab(tab) {
    // Tab headers
    tabNotesBtn.classList.toggle('active', tab === 'notes');
    tabChatBtn.classList.toggle('active', tab === 'chat');
    tabTranscriptBtn.classList.toggle('active', tab === 'transcript');

    // Panes
    notesPane.classList.toggle('hidden', tab !== 'notes');
    notesPane.classList.toggle('active', tab === 'notes');

    chatPane.classList.toggle('hidden', tab !== 'chat');
    chatPane.classList.toggle('active', tab === 'chat');

    transcriptPane.classList.toggle('hidden', tab !== 'transcript');
    transcriptPane.classList.toggle('active', tab === 'transcript');

    if (tab === 'chat') {
      chatInput.focus();
    }
  }

  // 7. Clear Video Data / Reset Button
  if (clearVideoDataBtn) {
    clearVideoDataBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      const vid = currentVideoId || extractVideoId(urlInput.value.trim());

      // Icon spin micro-animation for visual feedback
      const svgIcon = clearVideoDataBtn.querySelector('svg');
      if (svgIcon) {
        svgIcon.style.transition = 'transform 0.4s ease';
        svgIcon.style.transform = 'rotate(-360deg)';
        setTimeout(() => {
          svgIcon.style.transition = '';
          svgIcon.style.transform = '';
        }, 400);
      }

      if (vid) {
        await removeSavedVideoData(vid);
      }
      currentVideoId = '';
      currentSummaryNotes = '';
      currentDetailedNotes = '';
      currentTranscript = '';
      currentFormattedTranscript = '';
      currentTranscriptBlocks = [];
      currentTranscriptLang = '';
      selectedNotesLang = 'en';
      if (notesLangSelect) notesLangSelect.value = 'en';
      chatHistory = [];
      notesContent.innerHTML = '';
      transcriptContent.innerHTML = '';
      notesWordCount.textContent = '0 words';
      transcriptWordCount.textContent = '0 words';
      if (transcriptLangBadge) {
        transcriptLangBadge.textContent = '';
        transcriptLangBadge.classList.add('hidden');
      }
      resetChatMessages();
      notesView.classList.add('hidden');
      emptyState.classList.remove('hidden');
      showStatus("Cleared saved data for this video.", "info");
      setTimeout(hideStatus, 2500);
    });
  }

  // 8. Conversational Chat Logic
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
      showStatus("Please generate notes or load transcript first.", "error");
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

      // Update state history
      chatHistory.push({ role: 'user', text: question });
      chatHistory.push({ role: 'model', text: answer });

      // Save updated chat history to storage
      if (currentVideoId) {
        await saveVideoData(currentVideoId, {
          videoId: currentVideoId,
          url: urlInput.value.trim(),
          summaryNotes: currentSummaryNotes,
          detailedNotes: currentDetailedNotes,
          style: selectedStyle,
          transcript: currentTranscript,
          formattedTranscript: currentFormattedTranscript,
          transcriptBlocks: currentTranscriptBlocks,
          transcriptLang: currentTranscriptLang,
          chatHistory: chatHistory,
          savedAt: Date.now()
        });
      }

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

  // 9. Transcript Copy & Download (copies & downloads formatted transcript with timestamps)
  copyTranscriptBtn.addEventListener('click', async function () {
    const textToCopy = currentFormattedTranscript || currentTranscript;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      copyTranscriptBtn.classList.add('copied');
      copyTranscriptBtnText.textContent = "Copied!";
      const defIcon = copyTranscriptBtn.querySelector('.default-icon');
      const chkIcon = copyTranscriptBtn.querySelector('.check-icon');
      if (defIcon) defIcon.classList.add('hidden');
      if (chkIcon) chkIcon.classList.remove('hidden');

      setTimeout(() => {
        copyTranscriptBtn.classList.remove('copied');
        copyTranscriptBtnText.textContent = "Copy";
        if (defIcon) defIcon.classList.remove('hidden');
        if (chkIcon) chkIcon.classList.add('hidden');
      }, 2000);
    } catch (err) {
      console.error("Transcript copy failed:", err);
    }
  });

  downloadTranscriptBtn.addEventListener('click', function () {
    const textToDownload = currentFormattedTranscript || currentTranscript;
    if (!textToDownload) return;
    const filename = `TubeNotes_Transcript_${currentVideoId || 'video'}.txt`;
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // 10. Notes Copy & Download (copies currently selected style's notes)
  copyBtn.addEventListener('click', async function () {
    const activeNotes = selectedStyle === 'summary' ? currentSummaryNotes : currentDetailedNotes;
    if (!activeNotes) {
      showStatus("Generate notes for this style first.", "error");
      setTimeout(hideStatus, 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(activeNotes);
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

  downloadBtn.addEventListener('click', function () {
    const activeNotes = selectedStyle === 'summary' ? currentSummaryNotes : currentDetailedNotes;
    if (!activeNotes) {
      showStatus("Generate notes for this style first.", "error");
      setTimeout(hideStatus, 2000);
      return;
    }

    const filename = `TubeNotes_${currentVideoId || 'video'}_${selectedStyle}.md`;
    const blob = new Blob([activeNotes], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // ---------------- Persistent Storage Helpers ---------------- //

  async function getSavedVideoData(videoId) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([`tubenotes_${videoId}`], (result) => {
          resolve(result[`tubenotes_${videoId}`] || null);
        });
      } else {
        try {
          const val = localStorage.getItem(`tubenotes_${videoId}`);
          resolve(val ? JSON.parse(val) : null);
        } catch {
          resolve(null);
        }
      }
    });
  }

  async function saveVideoData(videoId, payload) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [`tubenotes_${videoId}`]: payload }, resolve);
      } else {
        try {
          localStorage.setItem(`tubenotes_${videoId}`, JSON.stringify(payload));
        } catch {}
        resolve();
      }
    });
  }

  async function removeSavedVideoData(videoId) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([`tubenotes_${videoId}`], resolve);
      } else {
        try {
          localStorage.removeItem(`tubenotes_${videoId}`);
        } catch {}
        resolve();
      }
    });
  }

  // Restore saved notes, chat, and transcript if previously generated
  async function checkAndRestoreSavedVideo(videoId) {
    const saved = await getSavedVideoData(videoId);
    if (saved && (saved.summaryNotes || saved.detailedNotes || saved.notes || saved.transcript)) {
      currentVideoId = videoId;
      currentTranscript = saved.transcript || '';
      currentFormattedTranscript = saved.formattedTranscript || saved.transcript || '';
      currentTranscriptBlocks = saved.transcriptBlocks || [];
      currentTranscriptLang = saved.transcriptLang || saved.languageLabel || '';
      selectedNotesLang = saved.notesLanguage || 'en';
      if (notesLangSelect) notesLangSelect.value = selectedNotesLang;
      chatHistory = saved.chatHistory || [];

      // Restore separate slots (with backward compatibility)
      currentSummaryNotes = saved.summaryNotes || (saved.style === 'summary' ? saved.notes : '') || '';
      currentDetailedNotes = saved.detailedNotes || (saved.style !== 'summary' ? saved.notes : '') || '';

      if (saved.style) {
        setChipActive(saved.style);
      } else {
        setChipActive('summary');
      }

      displayCurrentStyleNotes();

      if (currentTranscriptBlocks && currentTranscriptBlocks.length > 0) {
        renderTranscript({
          text: currentTranscript,
          formattedText: currentFormattedTranscript,
          blocks: currentTranscriptBlocks,
          languageLabel: currentTranscriptLang
        });
      } else if (currentTranscript) {
        renderTranscript({
          text: currentTranscript,
          languageLabel: currentTranscriptLang
        });
      }

      // Restore chat messages
      resetChatMessages();
      if (chatHistory.length > 0) {
        chatHistory.forEach(item => {
          appendChatMessage(item.role === 'user' ? 'user' : 'bot', item.text);
        });
      }

      emptyState.classList.add('hidden');
      notesView.classList.remove('hidden');
      switchTab('notes');
      showStatus("⚡ Restored saved video from memory!", "success");
      setTimeout(hideStatus, 2500);
      return true;
    }
    return false;
  }

  // ---------------- Helper Functions ---------------- //

  // Auto-detect YouTube tab
  function autoDetectCurrentTab(showAlertIfNone = false) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        if (tabs && tabs.length > 0 && tabs[0].url) {
          const tabUrl = tabs[0].url;
          const vid = extractVideoId(tabUrl);
          if (vid) {
            urlInput.value = tabUrl;
            toggleClearButton();

            // Try restoring existing notes & chat
            const restored = await checkAndRestoreSavedVideo(vid);
            if (!restored) {
              showStatus("Detected YouTube video. Ready to generate!", "success");
              setTimeout(hideStatus, 2500);
            }
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
    return data;
  }

  // Call Gemini backend for note generation
  async function generateAINotes(transcript, style, language = 'en') {
    const response = await fetch(`http://localhost:3000/generate-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, style, language })
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
      updateGenerateButtonText();
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

  // Safe HTML escaper to prevent injection
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render structured transcript with timestamps or fallback to text
  function renderTranscript(data) {
    let text = '';
    let blocks = [];

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      text = data.text || '';
      currentTranscript = text;
      currentFormattedTranscript = data.formattedText || text;
      currentTranscriptBlocks = Array.isArray(data.blocks) ? data.blocks : [];
      currentTranscriptLang = data.languageLabel || data.language || currentTranscriptLang || '';
      blocks = currentTranscriptBlocks;
    } else if (Array.isArray(data)) {
      blocks = data;
      currentTranscriptBlocks = blocks;
      text = blocks.map(b => b.text).join(' ');
      currentTranscript = text;
      currentFormattedTranscript = blocks.map(b => `[${b.timestamp}] ${b.text}`).join('\n\n');
    } else if (typeof data === 'string') {
      text = data;
      currentTranscript = text;
      currentFormattedTranscript = currentFormattedTranscript || text;
      blocks = currentTranscriptBlocks || [];
    }

    if (blocks && blocks.length > 0) {
      transcriptContent.innerHTML = blocks.map(b => `
        <div class="transcript-block" data-timestamp="${escapeHtml(b.timestamp)}">
          <span class="transcript-time-badge" title="Timestamp [${escapeHtml(b.timestamp)}]">${escapeHtml(b.timestamp)}</span>
          <span class="transcript-phrase-text">${escapeHtml(b.text)}</span>
        </div>
      `).join('');
    } else if (text) {
      transcriptContent.innerHTML = `
        <div class="transcript-block">
          <span class="transcript-phrase-text">${escapeHtml(text)}</span>
        </div>
      `;
    } else {
      transcriptContent.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; color: #6b7280; font-size: 12px;">
          No transcript available for this video.
        </div>
      `;
    }

    const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
    transcriptWordCount.textContent = `${words} words`;

    if (transcriptLangBadge) {
      if (currentTranscriptLang) {
        transcriptLangBadge.textContent = currentTranscriptLang;
        transcriptLangBadge.classList.remove('hidden');
      } else {
        transcriptLangBadge.classList.add('hidden');
      }
    }
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
