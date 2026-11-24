document.addEventListener('DOMContentLoaded', async () => {
  const consentToggle = document.getElementById('consent-toggle');
  const shareToggle = document.getElementById('share-toggle');
  const redactToggle = document.getElementById('redact-toggle');
  const promptsCount = document.getElementById('prompts-count');
  const statusIndicator = document.getElementById('status-indicator');
  const viewDashboardBtn = document.getElementById('view-dashboard-btn');
  const clearDataBtn = document.getElementById('clear-data-btn');

  // Load state from chrome.storage
  chrome.storage.local.get(['consent_enabled', 'share_prompt_text', 'redact_pii', 'captured_count'], (res) => {
    consentToggle.checked = res.consent_enabled !== false;
    shareToggle.checked = res.share_prompt_text !== false;
    redactToggle.checked = res.redact_pii !== false;
    promptsCount.textContent = res.captured_count || '0';
    updateIndicator(consentToggle.checked);
  });

  function updateIndicator(active) {
    if (active) {
      statusIndicator.classList.add('active');
    } else {
      statusIndicator.classList.remove('active');
    }
  }

  function saveSettings() {
    const settings = {
      consent_enabled: consentToggle.checked,
      share_prompt_text: shareToggle.checked,
      redact_pii: redactToggle.checked,
    };
    chrome.storage.local.set(settings);
    updateIndicator(settings.consent_enabled);

    // Notify background worker
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: settings,
    });
  }

  consentToggle.addEventListener('change', saveSettings);
  shareToggle.addEventListener('change', saveSettings);
  redactToggle.addEventListener('change', saveSettings);

  viewDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard/' });
  });

  clearDataBtn.addEventListener('click', () => {
    chrome.storage.local.set({ captured_count: 0 });
    promptsCount.textContent = '0';
    chrome.runtime.sendMessage({ type: 'CLEAR_LOCAL_DATA' });
  });
});
