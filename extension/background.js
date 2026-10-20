// TubeNotes - Manifest V3 Background Service Worker

// 1. Extension install/update lifecycle
chrome.runtime.onInstalled.addListener(() => {
  console.log('[TubeNotes Service Worker] Installed successfully.');
  // Keep default action click opening the popup window
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((err) => {
      console.warn('[TubeNotes] setPanelBehavior error:', err);
    });
  }

  // Create context menu entry on toolbar action
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'open_tubenotes_sidepanel',
      title: 'Open TubeNotes in Side Panel',
      contexts: ['action']
    }, () => {
      if (chrome.runtime.lastError) {
        // Ignored if already registered
      }
    });
  }
});

// Context menu click listener
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open_tubenotes_sidepanel' && chrome.sidePanel && chrome.sidePanel.open) {
      const targetWinId = tab ? tab.windowId : undefined;
      if (targetWinId) {
        chrome.sidePanel.open({ windowId: targetWinId }).catch((err) => {
          console.error('[TubeNotes] Error opening side panel from context menu:', err);
        });
      } else if (tab && tab.id) {
        chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
          console.error('[TubeNotes] Error opening side panel with tabId:', err);
        });
      }
    }
  });
}

// 2. Message listener for popup & side panel coordination
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Action: Open Side Panel from popup button
  if (message.action === 'OPEN_SIDE_PANEL') {
    const targetWindowId = message.windowId || (sender.tab ? sender.tab.windowId : undefined);

    if (chrome.sidePanel && chrome.sidePanel.open) {
      if (targetWindowId) {
        chrome.sidePanel.open({ windowId: targetWindowId })
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((err) => {
            console.error('[TubeNotes] Failed to open side panel for window:', targetWindowId, err);
            sendResponse({ success: false, error: err.message });
          });
      } else {
        // Fallback: Query current active window
        chrome.windows.getCurrent((win) => {
          if (win && win.id) {
            chrome.sidePanel.open({ windowId: win.id })
              .then(() => sendResponse({ success: true }))
              .catch((err) => {
                console.error('[TubeNotes] Failed to open side panel:', err);
                sendResponse({ success: false, error: err.message });
              });
          } else {
            sendResponse({ success: false, error: 'No active window found' });
          }
        });
      }
      return true; // Keep message channel open for async sendResponse
    } else {
      sendResponse({ success: false, error: 'Side Panel API is not supported in this Chrome version' });
      return false;
    }
  }

  // Action: Query active tab info
  if (message.action === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        sendResponse({ tab: tabs[0] });
      } else {
        sendResponse({ tab: null });
      }
    });
    return true;
  }
});

// 3. Tab switch & URL change broadcast (helpful for persistent Side Panel)
function notifyTabChange(tabId, url, title) {
  if (!url) return;
  // Check if it's a YouTube video
  const isYouTubeVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/');
  if (isYouTubeVideo) {
    chrome.runtime.sendMessage({
      action: 'YOUTUBE_TAB_CHANGED',
      tabId,
      url,
      title
    }).catch(() => {
      // Ignored: No listener is open if popup/side panel is not currently active
    });
  }
}

// Listen for tab activation (user switches active tab)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    notifyTabChange(tab.id, tab.url, tab.title);
  });
});

// Listen for tab URL updates (user navigates to new video within same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    notifyTabChange(tabId, changeInfo.url, tab.title);
  }
});
