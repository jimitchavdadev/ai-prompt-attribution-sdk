const BACKEND_URL = 'http://localhost:3000';

// Ensure install_id exists
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['install_id', 'consent_enabled', 'share_prompt_text', 'redact_pii'], (res) => {
    let installId = res.install_id;
    if (!installId) {
      installId = 'inst_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      chrome.storage.local.set({
        install_id: installId,
        consent_enabled: true,
        share_prompt_text: true,
        redact_pii: true,
        captured_count: 0,
      });
    }

    // Register with backend
    fetch(`${BACKEND_URL}/api/v1/extension/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        install_id: installId,
        consent_enabled: res.consent_enabled !== false,
        share_prompt_text: res.share_prompt_text !== false,
      }),
    }).catch((e) => console.log('[ServiceWorker] Backend register notice:', e.message));
  });
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_PROMPT') {
    handleSavePrompt(message.payload).then(sendResponse);
    return true; // async
  }

  if (message.type === 'SAVE_CITATIONS') {
    handleSaveCitations(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === 'CREATE_TOKEN') {
    handleCreateToken(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_ACTIVE_TOKEN') {
    chrome.storage.local.get(['latest_token'], (res) => {
      sendResponse({ token: res.latest_token || null });
    });
    return true;
  }

  if (message.type === 'UPDATE_SETTINGS') {
    chrome.storage.local.get(['install_id'], (res) => {
      if (res.install_id) {
        fetch(`${BACKEND_URL}/api/v1/extension/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            install_id: res.install_id,
            consent_enabled: message.payload.consent_enabled,
            share_prompt_text: message.payload.share_prompt_text,
          }),
        }).catch(() => {});
      }
    });
  }
});

async function handleSavePrompt(payload) {
  try {
    const storage = await chrome.storage.local.get(['install_id', 'consent_enabled', 'captured_count']);
    if (storage.consent_enabled === false) {
      return { success: false, reason: 'consent_disabled' };
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/extension/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        install_id: storage.install_id || 'inst_default_tester',
        ...payload,
      }),
    });

    const data = await res.json();
    const count = (storage.captured_count || 0) + 1;
    chrome.storage.local.set({ captured_count: count });
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleSaveCitations(payload) {
  try {
    const storage = await chrome.storage.local.get(['install_id']);
    const res = await fetch(`${BACKEND_URL}/api/v1/extension/citations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        install_id: storage.install_id || 'inst_default_tester',
        ...payload,
      }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleCreateToken(payload) {
  try {
    const storage = await chrome.storage.local.get(['install_id']);
    const res = await fetch(`${BACKEND_URL}/api/v1/extension/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        install_id: storage.install_id || 'inst_default_tester',
        ...payload,
      }),
    });
    const data = await res.json();
    if (data.token) {
      chrome.storage.local.set({ latest_token: data.token });
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}
