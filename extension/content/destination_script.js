// extension/content/destination_script.ts
(function() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get("_ai_token") || params.get("_ai_ref");
  function bridgeToken(token) {
    try {
      window.__AI_ATTR_TOKEN__ = token;
      sessionStorage.setItem("__ai_attr_token", token);
      window.dispatchEvent(new CustomEvent("ai-attribution-ready", {
        detail: { token }
      }));
    } catch {}
  }
  if (tokenFromUrl) {
    bridgeToken(tokenFromUrl);
  } else {
    try {
      chrome.runtime.sendMessage({ type: "GET_ACTIVE_TOKEN" }, (res) => {
        if (res && res.token) {
          bridgeToken(res.token);
        }
      });
    } catch {}
  }
})();
