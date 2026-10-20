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

  // Custom Prompt & Collapsible Accordion Elements
  const customPromptSection = document.getElementById('customPromptSection');
  const togglePromptBtn = document.getElementById('togglePromptBtn');
  const promptToggleText = document.getElementById('promptToggleText');
  const customPromptContainer = document.getElementById('customPromptContainer');
  const customPromptInput = document.getElementById('customPromptInput');
  const clearPromptBtn = document.getElementById('clearPromptBtn');

  // Top Action Buttons Group
  const actionButtonsGroup = document.getElementById('actionButtonsGroup');

  // Direct Ask Video Action Button
  const askVideoDirectBtn = document.getElementById('askVideoDirectBtn');
  const askVideoBtnText = document.getElementById('askVideoBtnText');
  const askVideoSpinner = document.getElementById('askVideoSpinner');

  // Fast Transcript Button
  const fetchTranscriptOnlyBtn = document.getElementById('fetchTranscriptOnlyBtn');
  const transcriptBtnText = document.getElementById('transcriptBtnText');
  const transcriptSpinner = document.getElementById('transcriptSpinner');

  // Notes Toolbar Elements
  const notesToolbar = document.getElementById('notesToolbar');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const regenerateBtnText = document.getElementById('regenerateBtnText');

  // Chat Suggestion Chips
  const chatSuggestions = document.getElementById('chatSuggestions');

  // Side Panel Elements & Tab Change Banner
  const openSidePanelBtn = document.getElementById('openSidePanelBtn');
  const sidePanelBadge = document.getElementById('sidePanelBadge');
  const tabSwitchBanner = document.getElementById('tabSwitchBanner');
  const tabSwitchText = document.getElementById('tabSwitchText');
  const switchVideoBtn = document.getElementById('switchVideoBtn');
  const dismissSwitchBtn = document.getElementById('dismissSwitchBtn');

  // State Management - Master Notes, Video Title, Transcript, and Chat
  let currentNotes = '';         // Comprehensive Master Notes
  let currentVideoId = '';
  let currentVideoTitle = '';    // Real YouTube video title
  let currentTranscript = '';
  let currentFormattedTranscript = ''; // Text with [00:00] timestamps for copy & export
  let currentTranscriptBlocks = [];     // Structured array for UI badges
  let currentTranscriptLang = '';       // Detected original language label
  let chatHistory = [];                 // Unified chat history for the video

  // Side Panel State
  let isSidePanel = false;
  let currentTabId = null;
  let currentWindowId = null;
  let pendingSwitchUrl = '';
  let pendingSwitchTitle = '';

  // Proactively capture current window ID to eliminate async delays on click
  if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
    chrome.windows.getCurrent(function (win) {
      if (win && win.id) currentWindowId = win.id;
    });
  }

  // Detect whether running in Chrome Popup or Side Panel
  function initSidePanelMode() {
    try {
      if (typeof chrome !== 'undefined' && chrome.extension && chrome.extension.getViews) {
        const popupViews = chrome.extension.getViews({ type: 'popup' });
        // If current window is NOT in popup views list, it is running in the side panel
        isSidePanel = !popupViews.includes(window);
      }
    } catch (e) {
      isSidePanel = window.innerHeight > 620;
    }

    if (isSidePanel) {
      document.body.classList.add('is-sidepanel');
      document.documentElement.classList.add('is-sidepanel');
      if (openSidePanelBtn) openSidePanelBtn.classList.add('hidden');
      if (sidePanelBadge) sidePanelBadge.classList.remove('hidden');
    } else {
      document.body.classList.add('is-popup');
      document.documentElement.classList.add('is-popup');
      if (openSidePanelBtn) openSidePanelBtn.classList.remove('hidden');
      if (sidePanelBadge) sidePanelBadge.classList.add('hidden');
    }
  }

  initSidePanelMode();

  // Header Open in Side Panel button (Directly calls chrome.sidePanel.open to maintain user gesture)
  if (openSidePanelBtn) {
    openSidePanelBtn.addEventListener('click', async function () {
      console.log('[TubeNotes] Clicked Side Panel button');

      if (typeof chrome === 'undefined' || !chrome.sidePanel || !chrome.sidePanel.open) {
        console.error('[TubeNotes] chrome.sidePanel API not available');
        showStatus('Side Panel API not available. Please reload extension in chrome://extensions', 'error');
        alert('Side Panel API not detected. Please go to chrome://extensions and click the Reload (🔄) icon on TubeNotes.');
        return;
      }

      try {
        // Step 1: Open side panel using stored windowId immediately (preserves user gesture synchronously)
        let targetWinId = currentWindowId;
        if (!targetWinId && chrome.windows && chrome.windows.getCurrent) {
          const win = await chrome.windows.getCurrent();
          targetWinId = win ? win.id : undefined;
        }

        if (targetWinId) {
          console.log('[TubeNotes] Opening side panel for window:', targetWinId);
          await chrome.sidePanel.open({ windowId: targetWinId });
          window.close();
          return;
        }

        // Step 2: Fallback with tabId
        let targetTabId = currentTabId;
        if (!targetTabId && chrome.tabs && chrome.tabs.query) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) targetTabId = tab.id;
        }

        if (targetTabId) {
          console.log('[TubeNotes] Opening side panel for tab:', targetTabId);
          await chrome.sidePanel.open({ tabId: targetTabId });
          window.close();
          return;
        }

        showStatus('Could not determine active window ID', 'error');
      } catch (err) {
        console.error('[TubeNotes] Direct sidePanel.open failed:', err);
        // Fallback: If direct call threw user gesture error, try via background service worker
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL', windowId: currentWindowId }, function (res) {
            if (res && res.success) {
              window.close();
            } else {
              showStatus('Failed to open side panel: ' + (err.message || 'Unknown error'), 'error');
            }
          });
        } else {
          showStatus('Failed to open side panel: ' + err.message, 'error');
        }
      }
    });
  }

  // Active Tab Switch Listener (for Side Panel mode)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message) {
      if (message.action === 'YOUTUBE_TAB_CHANGED' && isSidePanel) {
        const newVid = extractVideoId(message.url);
        if (newVid && newVid !== currentVideoId) {
          // If no content is currently active/generated, switch instantly
          if (!currentNotes && !currentTranscript && (!chatHistory || chatHistory.length === 0)) {
            urlInput.value = message.url;
            toggleClearButton();
            autoDetectCurrentTab(false);
          } else {
            // Content exists: show non-intrusive banner offering to load new video
            pendingSwitchUrl = message.url;
            pendingSwitchTitle = message.title || 'New YouTube Video';
            if (tabSwitchBanner && tabSwitchText) {
              const displayTitle = pendingSwitchTitle.replace(/ - YouTube$/, '').trim();
              tabSwitchText.textContent = `New video active: "${displayTitle}"`;
              tabSwitchBanner.classList.remove('hidden');
            }
          }
        }
      }
    });
  }

  if (switchVideoBtn) {
    switchVideoBtn.addEventListener('click', async function () {
      if (pendingSwitchUrl) {
        urlInput.value = pendingSwitchUrl;
        toggleClearButton();
        if (tabSwitchBanner) tabSwitchBanner.classList.add('hidden');
        await autoDetectCurrentTab(false);
        pendingSwitchUrl = '';
      }
    });
  }

  if (dismissSwitchBtn) {
    dismissSwitchBtn.addEventListener('click', function () {
      if (tabSwitchBanner) tabSwitchBanner.classList.add('hidden');
      pendingSwitchUrl = '';
    });
  }

  // 1. Auto-detect active YouTube tab on launch
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

  // Collapsible Custom Focus Accordion handlers
  if (togglePromptBtn && customPromptContainer) {
    togglePromptBtn.addEventListener('click', function () {
      const isCollapsed = customPromptContainer.classList.contains('collapsed');
      if (isCollapsed) {
        expandPromptInput(true);
      } else {
        collapsePromptInput();
      }
    });
  }

  function expandPromptInput(shouldFocus = false) {
    if (!customPromptContainer || !togglePromptBtn) return;
    customPromptContainer.classList.remove('collapsed');
    togglePromptBtn.classList.add('active');
    if (shouldFocus && customPromptInput) {
      customPromptInput.focus();
    }
  }

  function collapsePromptInput() {
    if (!customPromptContainer || !togglePromptBtn) return;
    customPromptContainer.classList.add('collapsed');
    togglePromptBtn.classList.remove('active');
  }

  function updatePromptUIState() {
    if (!customPromptInput || !clearPromptBtn || !togglePromptBtn) return;
    const val = customPromptInput.value.trim();
    if (val.length > 0) {
      clearPromptBtn.classList.remove('hidden');
      togglePromptBtn.classList.add('has-value');
      if (promptToggleText) {
        promptToggleText.textContent = `Focus: "${val.length > 20 ? val.substring(0, 20) + '...' : val}"`;
      }
    } else {
      clearPromptBtn.classList.add('hidden');
      togglePromptBtn.classList.remove('has-value');
      if (promptToggleText) {
        promptToggleText.textContent = '+ Custom Focus (Optional)';
      }
    }
  }

  if (customPromptInput) {
    customPromptInput.addEventListener('input', updatePromptUIState);
  }

  if (clearPromptBtn) {
    clearPromptBtn.addEventListener('click', function () {
      if (customPromptInput) {
        customPromptInput.value = '';
        updatePromptUIState();
        collapsePromptInput();
      }
    });
  }

  function toggleClearButton() {
    if (urlInput.value.trim().length > 0) {
      clearInputBtn.classList.remove('hidden');
    } else {
      clearInputBtn.classList.add('hidden');
    }
  }

  // Keyboard shortcut: Press Enter in URL bar
  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const vid = extractVideoId(urlInput.value.trim());
      // SAFEGUARD: If notes already exist for this video, switch to notes view rather than re-generating!
      if (vid && vid === currentVideoId && currentNotes) {
        setContentActive(true);
        switchTab('notes');
        return;
      }
      generateBtn.click();
    }
  });

  if (customPromptInput) {
    customPromptInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentNotes) {
          executeRegenerateNotes();
        } else {
          generateBtn.click();
        }
      }
    });
  }

  // Global Enter shortcut when popup is opened
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const activeEl = document.activeElement;
      // If user is typing in the chat input, chat already handles Enter
      if (activeEl === chatInput) return;
      // If already focused on an interactive button or link, let native click trigger
      if (activeEl && (activeEl.tagName === 'BUTTON' || activeEl.tagName === 'A')) return;

      // SAFEGUARD: If notes already exist for this video, do NOT auto-generate on accidental Enter!
      if (currentNotes && currentNotes.trim().length > 0) {
        return;
      }

      e.preventDefault();
      generateBtn.click();
    }
  });

  // Controls visibility between initial launch actions and active content view
  function setContentActive(isActive) {
    if (actionButtonsGroup) {
      actionButtonsGroup.classList.toggle('hidden', isActive);
    }
    if (isActive) {
      emptyState.classList.add('hidden');
      notesView.classList.remove('hidden');
    } else {
      notesView.classList.add('hidden');
      emptyState.classList.remove('hidden');
    }
    displayNotes();
  }

  function updateGenerateButtonText() {
    if (btnText) btnText.textContent = "Generate Notes";
  }

  // Display comprehensive notes in the notes pane
  function displayNotes() {
    updateGenerateButtonText();

    const hasNotes = Boolean(currentNotes && currentNotes.trim().length > 0);

    // Toggle notes toolbar visibility (Word count, Regenerate, Copy, Export)
    if (notesToolbar) {
      notesToolbar.classList.toggle('hidden', !hasNotes);
    }

    if (hasNotes) {
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

      // Ensure real video title is resolved
      await ensureVideoTitle(videoId);

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
        title: currentVideoTitle,
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
      setContentActive(true);
      switchTab('notes');

      setTimeout(() => {
        hideStatus();
      }, 3500);

    } catch (err) {
      console.error("TubeNotes Error:", err);
      showStatus(err.message || "Failed to generate notes. Check backend.", "error");
      skeletonLoader.classList.add('hidden');
      if (!currentNotes && !currentTranscript) {
        setContentActive(false);
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
        setContentActive(true);
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
        await ensureVideoTitle(videoId);
        displayNotes();

        // Save state
        await saveVideoData(videoId, {
          videoId: videoId,
          url: rawUrl,
          title: currentVideoTitle,
          notes: currentNotes,
          transcript: currentTranscript,
          formattedTranscript: currentFormattedTranscript,
          transcriptBlocks: currentTranscriptBlocks,
          transcriptLang: currentTranscriptLang,
          chatHistory: chatHistory,
          savedAt: Date.now()
        });

        setContentActive(true);
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
        setContentActive(true);
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
        await ensureVideoTitle(videoId);
        displayNotes();

        // Save to storage so it persists
        await saveVideoData(videoId, {
          videoId: videoId,
          url: rawUrl,
          title: currentVideoTitle,
          notes: currentNotes,
          transcript: currentTranscript,
          formattedTranscript: currentFormattedTranscript,
          transcriptBlocks: currentTranscriptBlocks,
          transcriptLang: currentTranscriptLang,
          chatHistory: chatHistory,
          savedAt: Date.now()
        });

        setContentActive(true);
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

    // Context-Aware Custom Focus: Only show on Notes tab; completely hide on Chat & Transcript!
    if (customPromptSection) {
      customPromptSection.classList.toggle('hidden', tab !== 'notes');
    }

    if (tab === 'notes') {
      displayNotes();
    }

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
      currentVideoTitle = '';
      currentNotes = '';
      currentTranscript = '';
      currentFormattedTranscript = '';
      currentTranscriptBlocks = [];
      currentTranscriptLang = '';
      if (customPromptInput) {
        customPromptInput.value = '';
        updatePromptUIState();
        collapsePromptInput();
      }
      if (customPromptSection) {
        customPromptSection.classList.remove('hidden');
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
      setContentActive(false);
      showStatus("Cleared saved data for this video.", "info");
      setTimeout(hideStatus, 2500);
    });
  }

  // 8. Toolbar Regenerate Button with 2-click Confirmation
  let regenConfirmTimer = null;

  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', async function () {
      if (regenerateBtn.classList.contains('confirm-state')) {
        clearTimeout(regenConfirmTimer);
        resetRegenBtnState();
        await executeRegenerateNotes();
      } else {
        regenerateBtn.classList.add('confirm-state');
        if (regenerateBtnText) regenerateBtnText.textContent = "Confirm?";
        regenConfirmTimer = setTimeout(resetRegenBtnState, 3500);
      }
    });
  }

  function resetRegenBtnState() {
    if (!regenerateBtn) return;
    regenerateBtn.classList.remove('confirm-state');
    if (regenerateBtnText) regenerateBtnText.textContent = "Regenerate";
  }

  async function executeRegenerateNotes() {
    const rawUrl = urlInput.value.trim();
    const videoId = currentVideoId || extractVideoId(rawUrl);

    if (!videoId) {
      showStatus("Please enter a valid YouTube video link.", "error");
      return;
    }

    currentVideoId = videoId;
    if (regenerateBtn) regenerateBtn.classList.add('spinning');
    setLoadingState(true, "Re-synthesizing notes with latest focus...");

    try {
      if (!currentTranscript) {
        showStatus("Extracting video captions...", "info");
        const transcriptData = await fetchTranscript(videoId);
        renderTranscript(transcriptData);
      }

      await ensureVideoTitle(videoId);

      const customPrompt = customPromptInput ? customPromptInput.value.trim() : '';
      showStatus("Synthesizing comprehensive notes with Gemini AI...", "info");

      const transcriptToSend = currentFormattedTranscript || currentTranscript;
      const generatedNotes = await generateAINotes(transcriptToSend, 'notes', customPrompt);

      currentNotes = generatedNotes;
      displayNotes();

      await saveVideoData(videoId, {
        videoId: videoId,
        url: rawUrl,
        title: currentVideoTitle,
        notes: currentNotes,
        customPrompt: customPrompt,
        transcript: currentTranscript,
        formattedTranscript: currentFormattedTranscript,
        transcriptBlocks: currentTranscriptBlocks,
        transcriptLang: currentTranscriptLang,
        chatHistory: chatHistory,
        savedAt: Date.now()
      });

      showStatus("Master notes re-synthesized!", "success");
      setContentActive(true);
      switchTab('notes');
      setTimeout(hideStatus, 3000);
    } catch (err) {
      console.error("Regenerate Error:", err);
      showStatus(err.message || "Failed to regenerate notes.", "error");
    } finally {
      if (regenerateBtn) regenerateBtn.classList.remove('spinning');
      setLoadingState(false);
    }
  }

  // 9. Interactive Starter Prompts (Clickable chips in Ask Video)
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', function () {
      const query = chip.dataset.query;
      if (query && chatInput) {
        chatInput.value = query;
        handleChatSubmit();
      }
    });
  });

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
          title: currentVideoTitle,
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

  downloadTranscriptBtn.addEventListener('click', async function () {
    const textToDownload = currentFormattedTranscript || currentTranscript;
    if (!textToDownload) return;

    if (!currentVideoTitle && currentVideoId) {
      await ensureVideoTitle(currentVideoId);
    }

    const displayTitle = currentVideoTitle || (currentVideoId ? `Video ${currentVideoId}` : 'Transcript');
    const cleanSlug = displayTitle
      .replace(/[^\w\s-]/gi, '')
      .trim()
      .replace(/\s+/g, ' ');
    const filename = `TubeNotes - ${cleanSlug} (Transcript).txt`;

    const rawUrl = urlInput.value.trim() || (currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : '');
    let fileContent = `# 🎬 ${displayTitle} - Transcript\n`;
    if (rawUrl) {
      fileContent += `YouTube: ${rawUrl}\n`;
    }
    fileContent += `Date: ${new Date().toLocaleDateString()}\n---\n\n`;
    fileContent += textToDownload;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
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

  downloadBtn.addEventListener('click', async function () {
    if (!currentNotes) {
      showStatus("Generate notes first.", "error");
      setTimeout(hideStatus, 2000);
      return;
    }

    if (!currentVideoTitle && currentVideoId) {
      await ensureVideoTitle(currentVideoId);
    }

    const displayTitle = currentVideoTitle || (currentVideoId ? `Video ${currentVideoId}` : 'Notes');
    const cleanSlug = displayTitle
      .replace(/[^\w\s-]/gi, '')
      .trim()
      .replace(/\s+/g, ' ');
    const filename = `TubeNotes - ${cleanSlug}.txt`;

    const rawUrl = urlInput.value.trim() || (currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : '');
    let fileContent = `# 🎬 ${displayTitle}\n`;
    if (rawUrl) {
      fileContent += `YouTube: ${rawUrl}\n`;
    }
    fileContent += `Date: ${new Date().toLocaleDateString()}\n---\n\n`;
    fileContent += currentNotes;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
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
        } catch { }
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
        } catch { }
        resolve();
      }
    });
  }

  // Restore saved notes, chat, and transcript if previously generated
  async function checkAndRestoreSavedVideo(videoId) {
    const saved = await getSavedVideoData(videoId);
    if (saved && (saved.summaryNotes || saved.detailedNotes || saved.notes || saved.transcript)) {
      currentVideoId = videoId;
      currentVideoTitle = saved.title || currentVideoTitle || '';
      currentTranscript = saved.transcript || '';
      currentFormattedTranscript = saved.formattedTranscript || saved.transcript || '';
      currentTranscriptBlocks = saved.transcriptBlocks || [];
      currentTranscriptLang = saved.transcriptLang || saved.languageLabel || '';
      chatHistory = saved.chatHistory || [];

      // Restore master notes (backward compatible with older saves)
      currentNotes = saved.notes || saved.detailedNotes || saved.summaryNotes || '';

      if (customPromptInput) {
        const savedPrompt = saved.customPrompt || '';
        customPromptInput.value = savedPrompt;
        if (savedPrompt) {
          expandPromptInput(false);
          updatePromptUIState();
        } else {
          collapsePromptInput();
          updatePromptUIState();
        }
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

      setContentActive(true);
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
        if (tabs && tabs.length > 0) {
          if (tabs[0].id) currentTabId = tabs[0].id;
          if (tabs[0].windowId) currentWindowId = tabs[0].windowId;

          if (tabs[0].url) {
            const tabUrl = tabs[0].url;
            const vid = extractVideoId(tabUrl);
            if (vid) {
              urlInput.value = tabUrl;
              toggleClearButton();

              // Try restoring existing notes & chat first
              const restored = await checkAndRestoreSavedVideo(vid);

              // Ensure video title is fully resolved (from tab, DOM scripting, or oEmbed)
              const title = await ensureVideoTitle(vid);

              // If notes existed without title, update storage
              if (restored && title && currentNotes) {
                await saveVideoData(vid, {
                  videoId: vid,
                  url: tabUrl,
                  title: title,
                  notes: currentNotes,
                  customPrompt: customPromptInput ? customPromptInput.value.trim() : '',
                  transcript: currentTranscript,
                  formattedTranscript: currentFormattedTranscript,
                  transcriptBlocks: currentTranscriptBlocks,
                  transcriptLang: currentTranscriptLang,
                  chatHistory: chatHistory,
                  savedAt: Date.now()
                });
              }

              if (!restored) {
                showStatus("Detected YouTube video. Ready to generate!", "success");
                setTimeout(hideStatus, 2500);
              }
              return;
            }
          }
        }
        if (showAlertIfNone) {
          showStatus("Active tab is not a YouTube video.", "error");
        }
      });
    }
  }

  // Multi-tiered video title resolver: Active Tab -> Tab Injected DOM -> YouTube oEmbed API
  async function ensureVideoTitle(videoId) {
    if (!videoId) return '';
    if (currentVideoTitle && currentVideoTitle.trim() && currentVideoTitle.trim().toLowerCase() !== 'youtube') {
      return currentVideoTitle;
    }

    // 1. Try Chrome Tabs query & active tab title
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0]) {
          const tab = tabs[0];
          if (tab.url && tab.url.includes(videoId)) {
            if (tab.title) {
              const cleanTabTitle = tab.title
                .replace(/^\(\d+\)\s*/, '')
                .replace(/\s*-\s*YouTube$/, '')
                .trim();
              if (cleanTabTitle && cleanTabTitle.toLowerCase() !== 'youtube') {
                currentVideoTitle = cleanTabTitle;
                return currentVideoTitle;
              }
            }

            // 1B. If tab title was just "YouTube", query page DOM directly via chrome.scripting
            if (chrome.scripting && chrome.scripting.executeScript && tab.id) {
              try {
                const results = await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => {
                    const el = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                      document.querySelector('#title h1') ||
                      document.querySelector('meta[property="og:title"]');
                    return el ? (el.content || el.textContent || '').trim() : '';
                  }
                });
                if (results && results[0] && results[0].result) {
                  const domTitle = results[0].result.trim();
                  if (domTitle && domTitle.toLowerCase() !== 'youtube') {
                    currentVideoTitle = domTitle;
                    return currentVideoTitle;
                  }
                }
              } catch (scriptErr) {
                // Scripting fallback silent ignore
              }
            }
          }
        }
      } catch (tabErr) {
        console.warn("Tab title check:", tabErr);
      }
    }

    // 2. Fetch directly from YouTube official oEmbed API (100% reliable, zero-auth, fast)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const resp = await fetch(oembedUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.title) {
          currentVideoTitle = data.title.trim();
          return currentVideoTitle;
        }
      }
    } catch (oembedErr) {
      console.warn("oEmbed title fetch:", oembedErr);
    }

    return currentVideoTitle || '';
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
          playPromise.catch(() => { });
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
      if (data.title && (!currentVideoTitle || currentVideoTitle.toLowerCase() === 'youtube')) {
        currentVideoTitle = data.title;
      }
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
