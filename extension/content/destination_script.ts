(function () {
  // Check if URL has _ai_token or if latest token was stored
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('_ai_token') || params.get('_ai_ref');

  function bridgeToken(token: string) {
    try {
      (window as any).__AI_ATTR_TOKEN__ = token;
      sessionStorage.setItem('__ai_attr_token', token);

      // Dispatch event to AITRACK SDK if already loaded
      window.dispatchEvent(
        new CustomEvent('ai-attribution-ready', {
          detail: { token },
        })
      );
    } catch {
      // Ignore storage restrictions
    }
  }

  if (tokenFromUrl) {
    bridgeToken(tokenFromUrl);
  } else {
    // Check background worker for active token in case URL parameter was stripped
    try {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TOKEN' }, (res) => {
        if (res && res.token) {
          bridgeToken(res.token);
        }
      });
    } catch {
      // Ignore context invalidated error
    }
  }
})();
