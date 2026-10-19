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

  // Custom Prompt Input Elements
  const customPromptInput = document.getElementById('customPromptInput');
  const clearPromptBtn = document.getElementById('clearPromptBtn');

  // Direct Ask Video Action Button
  const askVideoDirectBtn = document.getElementById('askVideoDirectBtn');
  const askVideoBtnText = document.getElementById('askVideoBtnText');
  const askVideoSpinner = document.getElementById('askVideoSpinner');

  // Fast Transcript Button
  const fetchTranscriptOnlyBtn = document.getElementById('fetchTranscriptOnlyBtn');
  const transcriptBtnText = document.getElementById('transcriptBtnText');
  const transcriptSpinner = document.getElementById('transcriptSpinner');

  // State Management - Master Notes, Transcript, and Chat
  let currentNotes = '';         // Comprehensive Master Notes
  let currentVideoId = '';
  let currentTranscript = '';
  let currentFormattedTranscript = ''; // Text with [00:00] timestamps for copy & export
  let currentTranscriptBlocks = [];     // Structured array for UI badges
  let currentTranscriptLang = '';       // Detected original language label
  let chatHistory = [];                 // Unified chat history for the video

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

  // Custom prompt input handlers & quick tags
  if (customPromptInput) {
    customPromptInput.addEventListener('input', toggleClearPromptBtn);
  }

  if (clearPromptBtn) {
    clearPromptBtn.addEventListener('click', function () {
      if (customPromptInput) {
        customPromptInput.value = '';
        toggleClearPromptBtn();
        customPromptInput.focus();
      }
    });
  }



  function toggleClearPromptBtn() {
    if (!clearPromptBtn || !customPromptInput) return;
    if (customPromptInput.value.trim().length > 0) {
      clearPromptBtn.classList.remove('hidden');
    } else {
      clearPromptBtn.classList.add('hidden');
    }
  }

  function toggleClearButton() {
    if (urlInput.value.trim().length > 0) {
      clearInputBtn.classList.remove('hidden');
    } else {
      clearInputBtn.classList.add('hidden');
    }
  }

  // Keyboard shortcut: Press Enter to trigger note generation
  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateBtn.click();
    }
  });

  if (customPromptInput) {
    customPromptInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        generateBtn.click();
      }
    });
  }

  // Global Enter shortcut when popup is opened (as long as focus is not inside the Chat input or another button)
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const activeEl = document.activeElement;
      // If user is typing in the chat input, chat already handles Enter
      if (activeEl === chatInput) return;
      // If already focused on an interactive button or link, let native click trigger
      if (activeEl && (activeEl.tagName === 'BUTTON' || activeEl.tagName === 'A')) return;
      
      e.preventDefault();
      generateBtn.click();
    }
  });

  function updateGenerateButtonText() {
    if (btnText) btnText.textContent = "Generate Notes";
  }

  // Display comprehensive notes in the notes pane
  function displayNotes() {
    updateGenerateButtonText();

    if (currentNotes && currentNotes.trim().length > 0) {
      renderNotes(currentNotes);
    } else {
      notesWordCount.textContent = "0 words";
      notesContent.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: #9ca3af;">
          <div style="margin: 0 auto 12px; width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 0, 51, 0.08); border: 1px solid rgba(255, 0, 51, 0.2); display: flex; align-items: center; justify-content: center; color: var(--crimson-primary); box-shadow: 0 0 16px rgba(255, 0, 51, 0.15);">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <p style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 6px;">No Notes Generated Yet</p>
          <p style="font-size: 11.5px; color: #6b7280; margin-bottom: 18px; max-width: 260px; margin-left: auto; margin-right: auto; line-height: 1.5;">
            Want comprehensive study notes with interactive timestamps? Click below to generate them in seconds.
          </p>
          <button id="inlineGenerateStyleBtn" class="action-btn primary-btn" style="margin: 0 auto; max-width: 220px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;">
            <svg class="spark-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.8L12 22l-2.4-7.2L2.4 12l7.2-2.8L12 2z"/>
            </svg>
            <span>Generate Notes</span>
          </button>
        </div>
      `;

      const inlineBtn = document.getElementById('inlineGenerateStyleBtn');
      if (inlineBtn) {
        inlineBtn.addEventListener('click', () => generateBtn.click());
      }
    }
  }

  // 4A. Primary Action: Generate AI Notes (Comprehensive with Timestamps)
  generateBtn.addEventListener('click', async function () {
    const rawUrl = urlInput.value.trim();
    const videoId = extractVideoId(rawUrl);

    if (!videoId) {
      showStatus("Please enter a valid YouTube video link.", "error");
      return;
    }

    currentVideoId = videoId;
    setLoadingState(true, "Preparing comprehensive notes...");

    try {
      // Step A: Fetch transcript only if we don't already have it
      if (!currentTranscript) {
        showStatus("Extracting video captions...", "info");
        const transcriptData = await fetchTranscript(videoId);
        renderTranscript(transcriptData);
      }

      // Step B: Send timestamped transcript to AI note generator
      const customPrompt = customPromptInput ? customPromptInput.value.trim() : '';
      showStatus("Synthesizing comprehensive notes with Gemini AI...", "info");

      // CRITICAL FIX: Pass the timestamped formatted transcript so Gemini anchors accurate timestamps!
      const transcriptToSend = currentFormattedTranscript || currentTranscript;
      const generatedNotes = await generateAINotes(transcriptToSend, 'notes', customPrompt);

      currentNotes = generatedNotes;

      // Display the newly generated notes
      displayNotes();

      // Step C: Save complete video state to persistent storage
      await saveVideoData(videoId, {
        videoId: videoId,
        url: rawUrl,
        notes: currentNotes,
        customPrompt: customPrompt,
        transcript: currentTranscript,
        formattedTranscript: currentFormattedTranscript,
        transcriptBlocks: currentTranscriptBlocks,
        transcriptLang: currentTranscriptLang,
        chatHistory: chatHistory,
        savedAt: Date.now()
      });

      showStatus("Master notes ready & saved!", "success");
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
      if (!currentNotes && !currentTranscript) {
        emptyState.classList.remove('hidden');
      }
    } finally {
      setLoadingState(false);
    }
  });

  // 4B. Direct Action: Ask Video Directly (Loads transcript & immediately opens Chat, 0 notes tokens)
  if (askVideoDirectBtn) {
    askVideoDirectBtn.addEventListener('click', async function () {
      const rawUrl = urlInput.value.trim();
      const videoId = extractVideoId(rawUrl);

      if (!videoId) {
        showStatus("Please enter a valid YouTube video link.", "error");
        return;
      }

      currentVideoId = videoId;

      // If transcript already loaded for this video, immediately jump into chat!
      if (currentTranscript && currentVideoId === videoId) {
        emptyState.classList.add('hidden');
        notesView.classList.remove('hidden');
        switchTab('chat');
        chatInput.focus();
        return;
      }

      askVideoDirectBtn.disabled = true;
      if (askVideoSpinner) askVideoSpinner.classList.remove('hidden');
      if (askVideoBtnText) askVideoBtnText.textContent = "Loading...";
      showStatus("Connecting to video transcript for Q&A...", "info");

      try {
        const transcriptData = await fetchTranscript(videoId);
        renderTranscript(transcriptData);
        displayNotes();

        // Save state
        await saveVideoData(videoId, {
          videoId: videoId,
          url: rawUrl,
          notes: currentNotes,
          transcript: currentTranscript,
          formattedTranscript: currentFormattedTranscript,
          transcriptBlocks: currentTranscriptBlocks,
          transcriptLang: currentTranscriptLang,
          chatHistory: chatHistory,
          savedAt: Date.now()
        });

        emptyState.classList.add('hidden');
        notesView.classList.remove('hidden');
        switchTab('chat');
        chatInput.focus();
        showStatus("Ready! Ask anything about this video.", "success");
        setTimeout(hideStatus, 2500);

      } catch (err) {
        console.error("Ask Video Init Error:", err);
        showStatus(err.message || "Failed to load video captions.", "error");
      } finally {
        askVideoDirectBtn.disabled = false;
        if (askVideoSpinner) askVideoSpinner.classList.add('hidden');
        if (askVideoBtnText) askVideoBtnText.textContent = "Ask Video";
      }
    });
  }

  // 4C. Fast Action: View Transcript Only (Instant, 0 AI tokens)
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
        displayNotes();

        // Save to storage so it persists
        await saveVideoData(videoId, {
          videoId: videoId,
          url: rawUrl,
          notes: currentNotes,
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
      currentNotes = '';
      currentTranscript = '';
      currentFormattedTranscript = '';
      currentTranscriptBlocks = [];
      currentTranscriptLang = '';
      if (customPromptInput) {
        customPromptInput.value = '';
        toggleClearPromptBtn();
      }
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
          transcript: currentFormattedTranscript || currentTranscript,
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
          notes: currentNotes,
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

  // 10. Notes Copy & Download (copies comprehensive notes with rich formatting)
  copyBtn.addEventListener('click', async function () {
    if (!currentNotes) {
      showStatus("Generate notes first.", "error");
      setTimeout(hideStatus, 2000);
      return;
    }
    try {
      const htmlFormatted = formatMarkdown(currentNotes);
      await copyRichAndPlainText(currentNotes, htmlFormatted);

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
      showStatus("Failed to copy notes.", "error");
    }
  });

  // Copies both rich HTML (for Apple Notes, Google Docs, Notion, Word) and plain text (for markdown editors)
  async function copyRichAndPlainText(plainText, htmlText) {
    // 1. Modern Async Clipboard API with ClipboardItem (standard in Chromium)
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const blobHtml = new Blob([htmlText], { type: 'text/html' });
        const blobText = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
        return;
      } catch (err) {
        console.warn("Async ClipboardItem write failed, trying fallback:", err);
      }
    }

    // 2. Fallback: Copy event listener (allows setting both text/html and text/plain)
    let copied = false;
    const copyListener = function (e) {
      e.clipboardData.setData('text/html', htmlText);
      e.clipboardData.setData('text/plain', plainText);
      e.preventDefault();
      copied = true;
    };
    document.addEventListener('copy', copyListener);
    try {
      document.execCommand('copy');
    } catch (cmdErr) {
      console.warn("execCommand copy error:", cmdErr);
    } finally {
      document.removeEventListener('copy', copyListener);
    }

    // 3. Fallback: write plain text
    if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plainText);
    }
  }

  downloadBtn.addEventListener('click', function () {
    if (!currentNotes) {
      showStatus("Generate notes first.", "error");
      setTimeout(hideStatus, 2000);
      return;
    }

    const filename = `TubeNotes_${currentVideoId || 'video'}_notes.txt`;
    const blob = new Blob([currentNotes], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // 11. Interactive Video Player Seeking (Event Delegation)
  // Listens on transcript, notes, and chat panes for any timestamp click or keypress
  if (transcriptContent) {
    transcriptContent.addEventListener('click', handleTimestampClick);
    transcriptContent.addEventListener('keydown', handleTimestampKeydown);
  }
  if (notesContent) {
    notesContent.addEventListener('click', handleTimestampClick);
    notesContent.addEventListener('keydown', handleTimestampKeydown);
  }
  if (chatMessages) {
    chatMessages.addEventListener('click', handleTimestampClick);
    chatMessages.addEventListener('keydown', handleTimestampKeydown);
  }

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
      chatHistory = saved.chatHistory || [];

      // Restore master notes (backward compatible with older saves)
      currentNotes = saved.notes || saved.detailedNotes || saved.summaryNotes || '';

      if (customPromptInput) {
        customPromptInput.value = saved.customPrompt || '';
        toggleClearPromptBtn();
      }

      displayNotes();

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

  // ---------------- Interactive Video Player Seeking Engine ---------------- //

  // Parse timestamp string into total seconds (e.g., "02:15" -> 135, "01:05:30" -> 3930)
  function parseTimestampToSeconds(timeStr) {
    if (!timeStr) return 0;
    const clean = String(timeStr).replace(/[\[\]\(\)\s]/g, '').trim();
    const parts = clean.split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return 0;

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  }

  // Format seconds to readable mm:ss or hh:mm:ss
  function formatSecondsToTime(totalSeconds) {
    const s = Math.floor(totalSeconds % 60);
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor(totalSeconds / 3600);
    const pad = (n) => n.toString().padStart(2, '0');
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  // Function injected into the YouTube tab's DOM context to seek playback
  function injectedSeekPlayer(targetSeconds) {
    try {
      // Strategy 1: YouTube native player API (Recommended - updates UI progress bar & buffer)
      const player = document.getElementById('movie_player') || document.querySelector('#movie_player');
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(targetSeconds, true);
        if (typeof player.playVideo === 'function') {
          player.playVideo();
        }
        return { success: true, method: 'movie_player' };
      }

      // Strategy 2: Standard HTML5 video element fallback
      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (video) {
        video.currentTime = targetSeconds;
        const playPromise = video.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        return { success: true, method: 'html5_video' };
      }

      return { success: false, reason: 'No video player found on page' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Find target YouTube tab to seek (current active tab or open tab matching videoId)
  async function getTargetYouTubeTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) return null;

    try {
      // 1. Current active tab in current window
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.url && (activeTab.url.includes('youtube.com/watch') || activeTab.url.includes('youtu.be/'))) {
        return activeTab;
      }

      // 2. Find any open YouTube tab with matching videoId
      if (currentVideoId) {
        const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
        const match = tabs.find(t => t.url && t.url.includes(currentVideoId));
        if (match) return match;
        if (tabs.length > 0) return tabs[0];
      }

      return activeTab || null;
    } catch (e) {
      console.warn("Could not query tabs for seeking:", e);
      return null;
    }
  }

  // Seek YouTube video in active or matching tab using chrome.scripting.executeScript
  async function seekVideoToTime(seconds, label = '') {
    if (typeof chrome === 'undefined' || !chrome.scripting) {
      console.warn("Chrome Scripting API is not available.");
      return;
    }

    try {
      const tab = await getTargetYouTubeTab();
      if (!tab || !tab.id) {
        showStatus("Please open a YouTube video tab to seek.", "error");
        setTimeout(hideStatus, 2500);
        return;
      }

      const displayTime = label || formatSecondsToTime(seconds);
      showStatus(`▶ Seeking video to ${displayTime}...`, "info");

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectedSeekPlayer,
        args: [seconds]
      });

      if (results && results[0] && results[0].result && results[0].result.success) {
        showStatus(`⚡ Jumped to ${displayTime}!`, "success");
        setTimeout(hideStatus, 1800);
      } else {
        setTimeout(hideStatus, 1500);
      }
    } catch (err) {
      console.error("Seek script execution error:", err);
      showStatus("Could not seek video in active tab.", "error");
      setTimeout(hideStatus, 2500);
    }
  }

  // Delegated click handler for seeking from any timestamp badge
  function handleTimestampClick(e) {
    const badge = e.target.closest('.transcript-time-badge, .interactive-timestamp-badge');
    if (!badge) return;

    e.preventDefault();
    e.stopPropagation();

    // Pulse micro-animation
    badge.classList.add('seeking-active');
    setTimeout(() => badge.classList.remove('seeking-active'), 350);

    const rawTime = badge.dataset.timestamp || badge.textContent.replace(/[▶\s]/g, '').trim();
    const seconds = parseTimestampToSeconds(rawTime);
    seekVideoToTime(seconds, rawTime);
  }

  // Delegated keyboard accessibility handler (Enter / Space to seek)
  function handleTimestampKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      const badge = e.target.closest('.transcript-time-badge, .interactive-timestamp-badge');
      if (!badge) return;
      e.preventDefault();
      badge.click();
    }
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
  async function generateAINotes(transcript, style, customPrompt = '') {
    const response = await fetch(`http://localhost:3000/generate-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, style, customPrompt })
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
          <span class="transcript-time-badge" role="button" tabindex="0" data-timestamp="${escapeHtml(b.timestamp)}" title="Jump video to ${escapeHtml(b.timestamp)}">
            <svg class="seek-play-icon" viewBox="0 0 24 24" width="9" height="9" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"/>
            </svg>
            ${escapeHtml(b.timestamp)}
          </span>
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

  // Lightweight safe Markdown to HTML parser that generates clean semantic HTML for UI and Clipboard
  function formatMarkdown(md) {
    if (!md) return '';

    const lines = md.split('\n');
    let html = [];
    let inList = false;
    let inOrderedList = false;
    let inBlockquote = false;
    let inCodeBlock = false;
    let codeBlockLines = [];

    function closeBlocks() {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOrderedList) { html.push('</ol>'); inOrderedList = false; }
      if (inBlockquote) { html.push('</blockquote>'); inBlockquote = false; }
    }

    function inlineFormat(text) {
      // 1. Escape HTML entities
      let out = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // 2. Protect inline code tokens
      const codeTokens = [];
      out = out.replace(/`([^`]+)`/g, (_, code) => {
        codeTokens.push(code);
        return `___CODE_TOKEN_${codeTokens.length - 1}___`;
      });

      // 3. Bold and Italics
      out = out
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      // 4. Sanitize raw YouTube timestamp URLs (e.g. https://www.youtube.com/watch?v=VIDEO_ID&t=150s)
      out = out.replace(/(?:\(|\[)?https?:\/\/(?:www\.)?youtube\.com\/watch\?[^\s\)]*?[?&]t=(\d+)s?(?:\)|\])?/gi, (_, sec) => {
        const totalSec = parseInt(sec, 10);
        return isNaN(totalSec) ? '' : `[${formatSecondsToTime(totalSec)}]`;
      });

      // 5. Interactive Timestamps: [mm:ss], (mm:ss), [hh:mm:ss], or standalone mm:ss / hh:mm:ss
      const timestampRegex = /(?:\[|\()(\d{1,2}:\d{2}(?::\d{2})?)(?:\]|\))|(?<=\s|^)(\d{1,2}:\d{2}(?::\d{2})?)(?=\s|[,.\-—:]|$)/g;
      out = out.replace(timestampRegex, (match, p1, p2) => {
        const ts = p1 || p2;
        const parts = ts.split(':').map(Number);
        if (parts.length === 2 && parts[1] >= 60) return match;
        if (parts.length === 3 && (parts[1] >= 60 || parts[2] >= 60)) return match;
        return `<span class="interactive-timestamp-badge" role="button" tabindex="0" data-timestamp="${ts}" title="Jump video to ${ts}"><svg class="seek-play-icon" viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>${ts}</span>`;
      });

      // 6. Restore inline code
      out = out.replace(/___CODE_TOKEN_(\d+)___/g, (_, idx) => {
        return `<code>${codeTokens[Number(idx)]}</code>`;
      });

      return out;
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      // Fenced code block (```)
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          const codeContent = codeBlockLines
            .map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
            .join('\n');
          html.push(`<pre><code>${codeContent}</code></pre>`);
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          closeBlocks();
          inCodeBlock = true;
          codeBlockLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      if (!trimmed) {
        closeBlocks();
        continue;
      }

      // Horizontal dividers (--- or *** or ___)
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        closeBlocks();
        html.push('<hr>');
        continue;
      }

      // Headings (# H1, ## H2, ### H3)
      const hMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (hMatch) {
        closeBlocks();
        const level = hMatch[1].length;
        html.push(`<h${level}>${inlineFormat(hMatch[2])}</h${level}>`);
        continue;
      }

      // Blockquotes (> Quote)
      const bqMatch = line.match(/^>\s?(.*)$/);
      if (bqMatch) {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inOrderedList) { html.push('</ol>'); inOrderedList = false; }
        if (!inBlockquote) {
          html.push('<blockquote>');
          inBlockquote = true;
        }
        html.push(`<p>${inlineFormat(bqMatch[1])}</p>`);
        continue;
      } else if (inBlockquote) {
        html.push('</blockquote>');
        inBlockquote = false;
      }

      // Unordered lists (* or -)
      const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (ulMatch) {
        if (inOrderedList) { html.push('</ol>'); inOrderedList = false; }
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        const indent = ulMatch[1].length;
        const style = indent >= 2 ? ` style="margin-left: ${Math.min(indent * 8, 32)}px"` : '';
        html.push(`<li${style}>${inlineFormat(ulMatch[2])}</li>`);
        continue;
      }

      // Ordered lists (1. or 2.)
      const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
      if (olMatch) {
        if (inList) { html.push('</ul>'); inList = false; }
        if (!inOrderedList) {
          html.push('<ol>');
          inOrderedList = true;
        }
        html.push(`<li>${inlineFormat(olMatch[2])}</li>`);
        continue;
      }

      // Regular paragraph line
      closeBlocks();
      html.push(`<p>${inlineFormat(trimmed)}</p>`);
    }

    if (inCodeBlock) {
      const codeContent = codeBlockLines
        .map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('\n');
      html.push(`<pre><code>${codeContent}</code></pre>`);
    }

    closeBlocks();
    return html.join('\n');
  }
});
