const API_BASE = window.location.origin;

let allPrompts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadOverview();
  loadPlatforms();
  loadPrompts();
  loadWebsites();

  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadOverview();
    loadPlatforms();
    loadPrompts();
    loadWebsites();
  });

  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('filter-search').addEventListener('input', applyFilters);
  document.getElementById('filter-platform').addEventListener('change', applyFilters);
  document.getElementById('filter-confidence').addEventListener('change', applyFilters);
});

async function loadOverview() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/analytics/overview`);
    const data = await res.json();
    document.getElementById('kpi-prompts').textContent = data.total_prompts || 0;
    document.getElementById('kpi-queries').textContent = data.total_search_queries || 0;
    document.getElementById('kpi-retrievals').textContent = data.total_retrievals || 0;
    document.getElementById('kpi-citations').textContent = data.total_citations || 0;
    document.getElementById('kpi-visits').textContent = data.total_attributed_visits || 0;
    document.getElementById('kpi-confidence').textContent = `${data.high_confidence_pct || 0}%`;
  } catch (err) {
    console.error('Failed to load overview:', err);
  }
}

async function loadPlatforms() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/analytics/platforms`);
    const data = await res.json();
    const container = document.getElementById('platform-container');
    container.innerHTML = '';

    for (const [key, plat] of Object.entries(data)) {
      const card = document.createElement('div');
      card.className = 'plat-card';
      card.innerHTML = `
        <div class="plat-title">${plat.platform}</div>
        <div class="plat-metrics">
          <span class="plat-stat-label">Prompts:</span><span class="plat-stat-val">${plat.prompt_count}</span>
          <span class="plat-stat-label">Queries:</span><span class="plat-stat-val">${plat.search_query_count}</span>
          <span class="plat-stat-label">Citations:</span><span class="plat-stat-val">${plat.citation_count}</span>
          <span class="plat-stat-label">Attributed:</span><span class="plat-stat-val">${plat.attributed_sessions}</span>
        </div>
      `;
      container.appendChild(card);
    }
  } catch (err) {
    console.error('Failed to load platforms:', err);
  }
}

async function loadPrompts() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/analytics/prompts`);
    allPrompts = await res.json();
    renderPromptsTable(allPrompts);
    if (allPrompts.length > 0) {
      loadJourney(allPrompts[0].prompt_id);
    }
  } catch (err) {
    console.error('Failed to load prompts:', err);
  }
}

function renderPromptsTable(prompts) {
  const tbody = document.getElementById('prompts-table-body');
  tbody.innerHTML = '';

  if (!prompts.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No prompts found</td></tr>';
    return;
  }

  prompts.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${p.prompt_id.slice(0, 10)}...</code></td>
      <td style="text-transform: capitalize;">${p.platform}</td>
      <td><strong>${escapeHtml(p.prompt_text)}</strong></td>
      <td>${p.generated_queries.length ? p.generated_queries.map((q) => `<code>${escapeHtml(q)}</code>`).join('<br>') : '<span style="color:#64748b">—</span>'}</td>
      <td>${p.cited_urls.length ? p.cited_urls.map((u) => `<a href="${u}" target="_blank" style="color:#60a5fa;display:block;">${escapeHtml(u.slice(0, 30))}...</a>`).join('') : '<span style="color:#64748b">—</span>'}</td>
      <td>${p.user_clicked ? '<span style="color:#10b981">Yes</span>' : '<span style="color:#94a3b8">No</span>'}</td>
      <td><span class="confidence-badge conf-${p.confidence}">${p.confidence}</span></td>
      <td><button class="btn btn-secondary btn-sm" onclick="loadJourney('${p.prompt_id}')">Inspect</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function applyFilters() {
  const query = document.getElementById('filter-search').value.toLowerCase();
  const platform = document.getElementById('filter-platform').value;
  const confidence = document.getElementById('filter-confidence').value;

  const filtered = allPrompts.filter((p) => {
    const matchesQuery = !query || p.prompt_text.toLowerCase().includes(query) || p.generated_queries.some((q) => q.toLowerCase().includes(query));
    const matchesPlatform = platform === 'all' || p.platform === platform;
    const matchesConfidence = confidence === 'all' || p.confidence === confidence;
    return matchesQuery && matchesPlatform && matchesConfidence;
  });

  renderPromptsTable(filtered);
}

async function loadJourney(promptId) {
  try {
    document.getElementById('journey-prompt-label').textContent = `Prompt ID: ${promptId}`;
    const res = await fetch(`${API_BASE}/api/v1/analytics/journey/${promptId}`);
    const data = await res.json();
    const pipeline = document.getElementById('journey-pipeline');
    pipeline.innerHTML = '';

    data.stages.forEach((st, idx) => {
      const stepDiv = document.createElement('div');
      stepDiv.className = `journey-step ${st.status}`;
      stepDiv.innerHTML = `
        <div class="step-num">Step ${idx + 1}</div>
        <div class="step-label">${st.name}</div>
        <div class="step-status">${st.status === 'observed' ? '✓ Observed' : '✕ Unavailable'}</div>
      `;
      pipeline.appendChild(stepDiv);

      if (idx < data.stages.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'journey-arrow';
        arrow.textContent = '→';
        pipeline.appendChild(arrow);
      }
    });
  } catch (err) {
    console.error('Failed to load journey:', err);
  }
}

async function loadWebsites() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/analytics/websites`);
    const data = await res.json();
    const tbody = document.getElementById('websites-table-body');
    tbody.innerHTML = '';

    data.forEach((w) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${w.site_id}</code></td>
        <td><strong>${w.domain}</strong></td>
        <td>${w.ai_retrievals}</td>
        <td>${w.ai_citations}</td>
        <td>${w.ai_referred_visits}</td>
        <td>${w.top_prompts.length ? w.top_prompts.map((p) => `• ${escapeHtml(p)}`).join('<br>') : '—'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load websites:', err);
  }
}

function exportData() {
  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allPrompts, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', jsonStr);
  a.setAttribute('download', `ai_prompt_attribution_${Date.now()}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.loadJourney = loadJourney;
