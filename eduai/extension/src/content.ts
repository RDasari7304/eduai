import { viewedContent, analyzedConcepts, setKnowledgeTree, setContentArea, setPageMetadata} from './util/state';
import { el, parseAIResponse, clear, navigateTo } from './util/utils';
import { createSidebar, renderHeader, renderBottomBar, showLoader } from './util/ui';
import { startTracking } from './util/tracking';
import { extractWithReadability } from './util/extraction';
import { renderKnowledgeMap } from './features/knowledge-map';
import {initializeExplainMode} from './views/explain';
import { viewHome } from './views/home';
import { viewDetail } from './views/detail';
 
function initialize() {
    if (document.getElementById('eduai-sidebar')) return;
 
    const sidebar = createSidebar();
    const metadata = extractWithReadability();
    setPageMetadata(metadata);
 
    const style = document.createElement('style');
    style.textContent = `
        #eduai-sidebar, .eduai-modal, .eduai-modal * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; -webkit-font-smoothing: antialiased; }
        #eduai-sidebar ::-webkit-scrollbar { width: 3px; }
        #eduai-sidebar ::-webkit-scrollbar-thumb { background: #1a1a34; border-radius: 3px; }
        @keyframes eduai-spin { to { transform: rotate(360deg); } }
        .eduai-spinner { animation: eduai-spin 0.7s linear infinite; }
    `;
    document.head.appendChild(style);
 
    renderHeader(sidebar);
 
    const contentAreaEl = el('div', { flex: '1', overflowY: 'auto' });
    setContentArea(contentAreaEl);
    sidebar.appendChild(contentAreaEl);
 
    viewHome(metadata);
 
    // Start engagement tracking
    startTracking();
 
    // Non-blocking DB fetch
    fetch('http://localhost:8000/knowledge/graph')
        .then(r => r.json())
        .then(data => { setKnowledgeTree(data); navigateTo(() => viewHome(metadata)); })
        .catch(() => {});
 
    // Analyze handler
    let isAnalyzing = false;
    const onAnalyze = async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        const btn = document.getElementById('eduai-analyze-btn');
        if (btn) { btn.textContent = '⟳ Working…'; (btn as HTMLButtonElement).style.opacity = '0.6'; }
        clear(contentAreaEl);
        const loader = showLoader(contentAreaEl);
        try {
            const resp = await fetch('http://localhost:8000/analyze', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...metadata, frameContent: viewedContent.join('\n\n') }),
            });
            if (resp.body) {
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let raw = '';
                while (true) { const { done, value } = await reader.read(); if (done) break; raw += decoder.decode(value); }
                if (loader.parentNode) loader.parentNode.removeChild(loader);
                const parsed = parseAIResponse(raw);
                if (parsed) {
                    const entry = { topic: parsed.topic || 'Untitled', subject: parsed.subject || '', url: metadata.full_url, data: parsed };
                    metadata.subject = parsed.subject || null;
                    const ex = analyzedConcepts.findIndex(c => c.url === entry.url);
                    if (ex >= 0) analyzedConcepts[ex] = entry; else analyzedConcepts.unshift(entry);
                    if (parsed.concepts) {
                        fetch('http://localhost:8000/knowledge/update', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: metadata.full_url, concepts: parsed.concepts,
                                topic: parsed.topic, summary: parsed.summary,
                                flashcards: parsed.flashcards, key_concepts: parsed.keyConcepts,
                            }),
                        }).catch(() => {});
                    }
                    navigateTo(() => viewDetail(entry.topic, entry.subject, parsed, [metadata.full_url], metadata));
                } else {
                    clear(contentAreaEl);
                    contentAreaEl.appendChild(el('p', { padding: '20px', color: '#e17055', fontSize: '11px', textAlign: 'center' }, 'Parse error. Try again.'));
                }
            }
        } catch (err) {
            if (loader.parentNode) loader.parentNode.removeChild(loader);
            clear(contentAreaEl);
            contentAreaEl.appendChild(el('p', { padding: '20px', color: '#e17055', fontSize: '11px', textAlign: 'center' }, (err as Error).message));
        }
        isAnalyzing = false;
        if (btn) { btn.textContent = '✦ Analyze'; (btn as HTMLButtonElement).style.opacity = '1'; }
        viewedContent.length = 0;
    };
 
    renderBottomBar(sidebar, onAnalyze, () => renderKnowledgeMap());
    document.body.style.marginRight = '360px';
    document.body.appendChild(sidebar);
    initializeExplainMode();
    
}
 
initialize();