import { Readability } from "@mozilla/readability";
 
// ─── State & Tracking (UNCHANGED) ────────────────────────────
const viewedContent: string[] = [];
const viewportTimers: Map<HTMLElement, number> = new Map<HTMLElement, number>();
const currentlyVisible: Set<HTMLElement> = new Set<HTMLElement>();
let currentState: string = "reading";
let velocityHistory: number[] = [0, 0, 0, 0, 0];
let lastScrollY: number = window.scrollY;
let stateStartTime: number = Date.now();
let lastMouseMoveTime: number = stateStartTime;
let lowVelocityTicks = 0;
let highVelocityTicks = 0;
 
// ─── App State ───────────────────────────────────────────────
const analyzedConcepts: { topic: string; subject: string; url: string; data: any }[] = [];
let knowledgeTree: any = null;
let contentArea: HTMLElement;
 
// ─── Engagement Tracking (UNCHANGED) ─────────────────────────
function flushViewport(now: number, e: HTMLElement, routineCheck: boolean) {
    if (viewportTimers.has(e)) {
        const ts = viewportTimers.get(e)!;
        const elapsed = now - ts;
        const exists = viewedContent.some(x => x == `${e.tagName}: ${e.innerText}`);
        let pushed = false;
        const threshold = routineCheck ? 10 : 20;
        if (elapsed > threshold && !exists) {
            viewedContent.push(`${e.tagName}: ${e.innerText}` || '');
            pushed = true;
        }
        if (!routineCheck || pushed) viewportTimers.delete(e);
    }
}
 
setInterval(() => {
    const v = Math.abs(window.scrollY - lastScrollY);
    velocityHistory.shift();
    velocityHistory.push(v);
    lastScrollY = window.scrollY;
    const sv = velocityHistory.reduce((a, b) => a + b, 0) / velocityHistory.length;
    let ns = currentState;
    const now = Date.now();
    switch (currentState) {
        case "reading":
            currentlyVisible.forEach(el => { if (!viewportTimers.has(el)) viewportTimers.set(el, now); });
            viewportTimers.forEach((_, e) => flushViewport(now, e, true));
            if (sv >= 60) { highVelocityTicks++; if (highVelocityTicks >= 5) { ns = "scrolling"; lowVelocityTicks = 0; } }
            else if (sv == 0 && now - lastMouseMoveTime >= 45000) ns = "idle";
            else highVelocityTicks = 0;
            break;
        case "scrolling":
            viewportTimers.forEach((_, e) => flushViewport(now, e, false));
            if (sv <= 10) { lowVelocityTicks++; if (lowVelocityTicks >= 15) { ns = "reading"; highVelocityTicks = 0; } }
            else lowVelocityTicks = 0;
            break;
        case "idle":
            if (sv > 0) ns = "scrolling";
    }
    if (ns != currentState) currentState = ns;
}, 100);
 
document.onmousemove = () => { lastMouseMoveTime = Date.now(); if (currentState == "idle") currentState = "reading"; };
 
// ─── Utility ─────────────────────────────────────────────────
function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElementTagNameMap[K] {
    const n = document.createElement(tag);
    Object.assign(n.style, style);
    if (text) n.textContent = text;
    return n;
}
 
function parseAIResponse(raw: string): any {
    try { return JSON.parse(raw); } catch {}
    const s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/\n/g, ' ').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/\s+/g, ' ');
    try { return JSON.parse(s); } catch {}
    const sub = s.substring(s.indexOf('{'), s.lastIndexOf('}') + 1);
    try { return JSON.parse(sub); } catch { return null; }
}
 
function clear(node: HTMLElement) { while (node.firstChild) node.removeChild(node.firstChild); }
 
function navigateTo(view: () => void) { clear(contentArea); view(); }
 
function collectAllNames(node: any): string[] {
    const names: string[] = [];
    (node.children || []).forEach((c: any) => { names.push(c.name); names.push(...collectAllNames(c)); });
    return names;
}
 
function parseSources(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
}
 
// ─── Sidebar Shell ───────────────────────────────────────────
function createSidebar(): HTMLDivElement {
    const s = el('div', {
        position: 'fixed', top: '0', right: '0', width: '360px', height: '100vh',
        background: '#0c0c18', zIndex: '10000',
        boxShadow: '-4px 0 30px rgba(0,0,0,0.5)',
        color: '#e0e0e0', overflow: 'hidden', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
    });
    s.id = 'eduai-sidebar';
    return s;
}
 
function renderHeader(container: HTMLElement) {
    const bar = el('div', {
        padding: '12px 16px', borderBottom: '1px solid #161630',
        display: 'flex', alignItems: 'center', gap: '10px', flexShrink: '0',
    });
    const logo = el('div', {
        width: '26px', height: '26px', borderRadius: '6px',
        background: 'linear-gradient(135deg, #7c5cf7, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: '800', color: '#fff',
    });
    logo.textContent = 'E';
    const col = el('div', { flex: '1' });
    col.appendChild(el('div', { fontSize: '14px', fontWeight: '700', color: '#fff', lineHeight: '1' }, 'EduAI'));
    col.appendChild(el('div', { fontSize: '9px', color: '#444', marginTop: '2px' }, 'Contextual study companion'));
    const dot = el('div', { width: '7px', height: '7px', borderRadius: '50%', background: '#00b894', transition: 'background 0.3s' });
    dot.id = 'eduai-dot';
    setInterval(() => { const d = document.getElementById('eduai-dot'); if (d) d.style.background = currentState === 'reading' ? '#00b894' : currentState === 'scrolling' ? '#fdcb6e' : '#636e72'; }, 200);
    bar.appendChild(logo); bar.appendChild(col); bar.appendChild(dot);
    container.appendChild(bar);
}
 
function renderBottomBar(container: HTMLElement, onAnalyze: () => void) {
    const bar = el('div', { padding: '10px 12px', borderTop: '1px solid #161630', display: 'flex', gap: '6px', flexShrink: '0' });
    const aBtn = el('button', {
        flex: '1', padding: '10px 0', background: 'linear-gradient(135deg, #7c5cf7, #3b82f6)',
        color: '#fff', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
    }, '✦ Analyze');
    aBtn.id = 'eduai-analyze-btn';
    aBtn.addEventListener('click', onAnalyze);
    const mBtn = el('button', {
        padding: '10px 12px', background: 'transparent', color: '#7c5cf7',
        border: '1px solid #1e1e3a', borderRadius: '7px', fontSize: '11px', cursor: 'pointer',
    }, '🧠');
    mBtn.title = 'Knowledge Map';
    mBtn.addEventListener('click', () => renderKnowledgeMap());
    bar.appendChild(aBtn); bar.appendChild(mBtn);
    container.appendChild(bar);
}
 
// ─── HOME VIEW ───────────────────────────────────────────────
function viewHome(metadata: any) {
    // Currently Reading
    const rs = el('div', { padding: '14px 14px 0' });
    rs.appendChild(el('div', { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#444', marginBottom: '8px' }, '📖  Currently Reading'));
    const rc = el('div', { padding: '12px', background: '#111125', borderRadius: '8px', border: '1px solid #1a1a34' });
    const t = metadata.title.length > 55 ? metadata.title.substring(0, 55) + '…' : metadata.title;
    rc.appendChild(el('div', { fontSize: '12px', fontWeight: '600', color: '#ddd', marginBottom: '3px', lineHeight: '1.3' }, t));
    rc.appendChild(el('div', { fontSize: '9px', color: '#444' }, metadata.hostname));
    const ctr = el('div', { fontSize: '9px', color: '#333', marginTop: '6px' });
    ctr.id = 'eduai-read-count';
    rc.appendChild(ctr);
    setInterval(() => { const c = document.getElementById('eduai-read-count'); if (c) c.textContent = `${viewedContent.length} sections captured · ${currentState}`; }, 500);
    rs.appendChild(rc);
    contentArea.appendChild(rs);
 
    contentArea.appendChild(el('div', { height: '1px', background: '#161630', margin: '14px 14px 0' }));
 
    // In-session analyses
    if (analyzedConcepts.length > 0) {
        const sessionSec = el('div', { padding: '14px 14px 0' });
        sessionSec.appendChild(el('div', { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#444', marginBottom: '8px' }, '⚡  This Session'));
        analyzedConcepts.forEach(concept => {
            const card = el('div', {
                padding: '10px 12px', background: '#111125', borderRadius: '7px',
                border: '1px solid #1a1a34', cursor: 'pointer', marginBottom: '5px',
                display: 'flex', alignItems: 'center', gap: '10px', transition: 'border-color 0.15s',
            });
            card.appendChild(el('div', { width: '3px', height: '28px', borderRadius: '2px', background: '#7c5cf7', flexShrink: '0' }));
            const info = el('div', { flex: '1', overflow: 'hidden' });
            info.appendChild(el('div', { fontSize: '12px', fontWeight: '600', color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, concept.topic));
            if (concept.subject) info.appendChild(el('div', { fontSize: '8px', color: '#7c5cf7', marginTop: '2px', textTransform: 'uppercase', fontWeight: '700' }, concept.subject));
            card.appendChild(info);
            card.appendChild(el('span', { fontSize: '10px', color: '#333' }, '→'));
            card.addEventListener('mouseenter', () => { card.style.borderColor = '#2a2a4a'; });
            card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; });
            card.addEventListener('click', () => navigateTo(() => viewDetail(concept.topic, concept.subject, concept.data, [concept.url], metadata)));
            sessionSec.appendChild(card);
        });
        contentArea.appendChild(sessionSec);
        contentArea.appendChild(el('div', { height: '1px', background: '#161630', margin: '10px 14px 0' }));
    }
 
    // Knowledge base tree
    const treeSec = el('div', { padding: '14px' });
    treeSec.appendChild(el('div', { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#444', marginBottom: '10px' }, '🧪  Knowledge Base'));
 
    if (!knowledgeTree || Object.keys(knowledgeTree).length === 0) {
        const empty = el('div', { padding: '24px 10px', textAlign: 'center' });
        empty.appendChild(el('div', { fontSize: '18px', marginBottom: '6px', opacity: '0.15' }, '✦'));
        empty.appendChild(el('div', { fontSize: '10px', color: '#333', lineHeight: '1.6' }, 'No topics yet. Analyze pages to build your knowledge base.'));
        treeSec.appendChild(empty);
    } else {
        const roots = Object.values(knowledgeTree) as any[];
        roots.forEach((discipline: any) => {
            if (!discipline.children || discipline.children.length === 0) return;
 
            const discHeader = el('div', {
                fontSize: '10px', fontWeight: '700', color: '#555',
                padding: '10px 0 6px', borderBottom: '1px solid #111125', marginBottom: '4px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
            }, discipline.name);
            treeSec.appendChild(discHeader);
 
            discipline.children.forEach((topic: any) => {
                const hasChildren = topic.children && topic.children.length > 0;
                const topicWrap = el('div', { marginBottom: '2px' });
 
                const topicRow = el('div', {
                    padding: '9px 10px', background: '#0e0e22', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', transition: 'background 0.15s',
                });
 
                const arrow = el('span', {
                    fontSize: '8px', color: '#333', width: '10px', textAlign: 'center',
                    transition: 'transform 0.2s, color 0.2s',
                }, hasChildren ? '▶' : '·');
 
                topicRow.appendChild(arrow);
                topicRow.appendChild(el('span', {
                    fontSize: '12px', fontWeight: '600', color: '#bbb', flex: '1',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }, topic.name));
 
                if (hasChildren) {
                    topicRow.appendChild(el('span', { fontSize: '8px', color: '#2a2a4a' }, `${topic.children.length}`));
                }
 
                topicRow.addEventListener('mouseenter', () => { topicRow.style.background = '#111130'; });
                topicRow.addEventListener('mouseleave', () => { topicRow.style.background = '#0e0e22'; });
                topicWrap.appendChild(topicRow);
 
                const subtopicList = el('div', { display: 'none', paddingLeft: '18px', paddingTop: '2px' });
 
                if (hasChildren) {
                    topic.children.forEach((subtopic: any) => {
                        const subRow = el('div', {
                            padding: '7px 10px', borderRadius: '5px',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            cursor: 'pointer', transition: 'background 0.15s', marginBottom: '1px',
                        });
                        subRow.appendChild(el('div', { width: '4px', height: '4px', borderRadius: '50%', background: '#333', flexShrink: '0' }));
                        subRow.appendChild(el('span', { fontSize: '11px', color: '#888', flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, subtopic.name));
                        subRow.appendChild(el('span', { fontSize: '9px', color: '#222' }, '→'));
                        subRow.addEventListener('mouseenter', () => { subRow.style.background = '#111130'; });
                        subRow.addEventListener('mouseleave', () => { subRow.style.background = 'transparent'; });
 
                        subRow.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const sources = parseSources(subtopic.sources);
                            navigateTo(() => viewDetail(
                                subtopic.name, discipline.name,
                                { topic: subtopic.name, subject: discipline.name, keyConcepts: collectAllNames(subtopic), flashcards: [], summary: null },
                                sources, metadata
                            ));
                        });
                        subtopicList.appendChild(subRow);
                    });
 
                    let open = false;
                    topicRow.addEventListener('click', () => {
                        open = !open;
                        subtopicList.style.display = open ? 'block' : 'none';
                        arrow.textContent = open ? '▼' : '▶';
                        arrow.style.color = open ? '#7c5cf7' : '#333';
                    });
                } else {
                    topicRow.addEventListener('click', () => {
                        const sources = parseSources(topic.sources);
                        navigateTo(() => viewDetail(
                            topic.name, discipline.name,
                            { topic: topic.name, subject: discipline.name, keyConcepts: [], flashcards: [], summary: null },
                            sources, metadata
                        ));
                    });
                }
 
                topicWrap.appendChild(subtopicList);
                treeSec.appendChild(topicWrap);
            });
        });
    }
 
    contentArea.appendChild(treeSec);
}
 
// ─── DETAIL VIEW ─────────────────────────────────────────────
function viewDetail(topicName: string, subject: string, data: any, sources: string[], metadata: any) {
    // Back bar
    const back = el('div', {
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        background: '#111125',
        borderBottom: '1px solid #1a1a34',
        transition: 'background 0.15s',
    });
    const bArr = el('span', {
        fontSize: '14px', color: '#7c5cf7', fontWeight: '600',
        transition: 'transform 0.15s ease', display: 'inline-block',
    }, '◂');
    const bLbl = el('span', {
        fontSize: '12px', fontWeight: '600', color: '#888',
    }, 'All Topics');
    back.appendChild(bArr);
    back.appendChild(bLbl);
    back.addEventListener('mouseenter', () => { back.style.background = '#1a1a3a'; bArr.style.transform = 'translateX(-3px)'; bLbl.style.color = '#fff'; });
    back.addEventListener('mouseleave', () => { back.style.background = '#111125'; bArr.style.transform = 'translateX(0)'; bLbl.style.color = '#888'; });
    back.addEventListener('click', () => navigateTo(() => viewHome(metadata)));
    contentArea.appendChild(back);
 
    // Header
    const hdr = el('div', { padding: '14px 14px 0' });
    hdr.appendChild(el('div', { fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '4px' }, topicName));
    if (subject) {
        hdr.appendChild(el('span', {
            display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
            fontSize: '8px', fontWeight: '700', background: '#7c5cf720',
            color: '#7c5cf7', textTransform: 'uppercase', letterSpacing: '0.5px',
        }, subject));
    }
    contentArea.appendChild(hdr);
 
    // Chips + feature area
    const chipBar = el('div', { padding: '10px 14px', display: 'flex', gap: '5px', flexWrap: 'wrap' });
    const featureArea = el('div', {});
    const active: Record<string, boolean> = {};
 
    // Mutable data ref that gets updated when analyses load
    const liveData = { ...data };
 
    function buildChips() {
        const features = [
            { id: 'summary', label: '📝 Summary', fn: () => renderSummary(featureArea, liveData) },
            { id: 'concepts', label: '💡 Concepts', fn: () => renderConcepts(featureArea, liveData) },
            { id: 'cards', label: '🃏 Cards', fn: () => renderFlashcards(featureArea, liveData) },
            { id: 'links', label: '🔗 Resources', fn: () => renderLinks(featureArea, liveData, sources) }
        ];
 
        features.forEach(f => {
            const chip = el('button', {
                padding: '4px 9px', background: '#111125', color: '#555',
                border: '1px solid #1a1a34', borderRadius: '12px',
                fontSize: '10px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
            }, f.label);
 
            chip.addEventListener('click', () => {
                clear(featureArea);
                if (active[f.id]) {
                    active[f.id] = false;
                    chip.style.background = '#111125'; chip.style.color = '#555'; chip.style.borderColor = '#1a1a34';
                } else {
                    Object.keys(active).forEach(k => active[k] = false);
                    chipBar.querySelectorAll('button').forEach(b => {
                        (b as HTMLElement).style.background = '#111125';
                        (b as HTMLElement).style.color = '#555';
                        (b as HTMLElement).style.borderColor = '#1a1a34';
                    });
                    active[f.id] = true;
                    chip.style.background = '#1a1a3a'; chip.style.color = '#fff'; chip.style.borderColor = '#7c5cf7';
                    f.fn();
                }
            });
            chipBar.appendChild(chip);
        });
    }
 
    buildChips();
    contentArea.appendChild(chipBar);
    contentArea.appendChild(featureArea);
 
    // If data already has summary (in-session analysis), show it immediately
    if (liveData.summary) {
        (chipBar.querySelectorAll('button')[0] as HTMLElement).click();
    } else if (liveData.keyConcepts && liveData.keyConcepts.length > 0) {
        (chipBar.querySelectorAll('button')[1] as HTMLElement).click();
    }
 
    // If we have sources but no summary, fetch stored analyses from DB
    if (!liveData.summary && sources.length > 0) {
        const urlParam = sources.map(u => encodeURIComponent(u)).join(',');
        fetch(`http://localhost:8000/knowledge/analyses?urls=${urlParam}`)
            .then(r => r.json())
            .then((analyses: any[]) => {
                if (!analyses || analyses.length === 0) return;
 
                // Merge all analyses: combine summaries, flashcards, key_concepts
                const summaries: string[] = [];
                const allFlashcards: any[] = [];
                const allKeyConcepts: string[] = [];
 
                analyses.forEach((a: any) => {
                    if (a.summary) summaries.push(a.summary);
                    try {
                        const fc = typeof a.flashcards === 'string' ? JSON.parse(a.flashcards) : (a.flashcards || []);
                        allFlashcards.push(...fc);
                    } catch {}
                    try {
                        const kc = typeof a.key_concepts === 'string' ? JSON.parse(a.key_concepts) : (a.key_concepts || []);
                        allKeyConcepts.push(...kc);
                    } catch {}
                });
 
                // Update liveData
                if (summaries.length > 0) liveData.summary = summaries.join('\n\n');
                if (allFlashcards.length > 0) liveData.flashcards = allFlashcards;
                if (allKeyConcepts.length > 0) {
                    const existing = liveData.keyConcepts || [];
                    const merged = [...new Set([...existing, ...allKeyConcepts])];
                    liveData.keyConcepts = merged;
                }
 
                // Re-render the currently active chip with new data
                const activeId = Object.keys(active).find(k => active[k]);
                if (activeId) {
                    clear(featureArea);
                    const features: Record<string, () => void> = {
                        summary: () => renderSummary(featureArea, liveData),
                        concepts: () => renderConcepts(featureArea, liveData),
                        cards: () => renderFlashcards(featureArea, liveData),
                        links: () => renderLinks(featureArea, liveData, sources) 
                    };
                    if (features[activeId]) features[activeId]();
                } else {
                    // No chip was active, auto-click summary now that we have data
                    if (liveData.summary) {
                        (chipBar.querySelectorAll('button')[0] as HTMLElement).click();
                    }
                }
            })
            .catch(() => {});
    }
}
 
// ─── Feature Renderers ───────────────────────────────────────
function lbl(text: string): HTMLElement {
    return el('div', { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#444', marginBottom: '8px' }, text);
}
 
function renderSummary(area: HTMLElement, data: any) {
    const sec = el('div', { padding: '4px 14px 14px' });
    sec.appendChild(lbl('Summary'));
    if (data && data.summary) {
        sec.appendChild(el('p', {
            fontSize: '12px', lineHeight: '1.7', color: '#999', margin: '0', padding: '12px',
            background: '#111125', borderRadius: '8px', borderLeft: '2px solid #7c5cf7',
        }, data.summary));
    } else {
        sec.appendChild(el('p', { fontSize: '11px', color: '#333', textAlign: 'center', padding: '20px' }, 'Analyze a page about this topic to generate a summary.'));
    }
    area.appendChild(sec);
}
 
function renderConcepts(area: HTMLElement, data: any) {
    const concepts = data ? data.keyConcepts : [];
    if (!concepts || !concepts.length) {
        area.appendChild(el('p', { padding: '20px 14px', color: '#333', textAlign: 'center', fontSize: '10px' }, 'No concepts extracted.'));
        return;
    }
    const sec = el('div', { padding: '4px 14px 14px' });
    sec.appendChild(lbl('Key Concepts'));
    const list = el('div', { display: 'flex', flexDirection: 'column', gap: '4px' });
    concepts.forEach((c: any) => {
        const item = el('div', { padding: '8px 10px', background: '#111125', borderRadius: '6px', fontSize: '11px', lineHeight: '1.5' });
        const term = typeof c === 'string' ? c : (c.term || c.name || '');
        const def = typeof c === 'string' ? '' : (c.definition || c.description || '');
        item.appendChild(el('span', { fontWeight: '600', color: '#a29bfe' }, term));
        if (def) item.appendChild(el('span', { color: '#555' }, ` — ${def}`));
        list.appendChild(item);
    });
    sec.appendChild(list);
    area.appendChild(sec);
}
 
function renderFlashcards(area: HTMLElement, data: any) {
    const cards = data ? data.flashcards : [];
    if (!cards || !cards.length) {
        area.appendChild(el('p', { padding: '20px 14px', color: '#333', textAlign: 'center', fontSize: '10px' }, 'Analyze a page about this topic to generate flashcards.'));
        return;
    }
    const sec = el('div', { padding: '4px 14px 14px' });
    sec.appendChild(lbl('Flashcards'));
    let idx = 0, front = true;
    const card = el('div', {
        padding: '20px 16px', background: '#111125', borderRadius: '10px', minHeight: '80px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        cursor: 'pointer', border: '1px solid #1a1a34', textAlign: 'center', transition: 'border-color 0.2s',
    });
    const side = el('span', { fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#7c5cf7', marginBottom: '8px' }, 'QUESTION');
    const txt = el('p', { fontSize: '12px', lineHeight: '1.6', color: '#ccc', margin: '0' }, cards[0].front || '');
    card.appendChild(side); card.appendChild(txt);
    function upd() { front = true; side.textContent = 'QUESTION'; side.style.color = '#7c5cf7'; txt.textContent = cards[idx].front || ''; card.style.borderColor = '#1a1a34'; cnt.textContent = `${idx+1}/${cards.length}`; }
    card.addEventListener('click', () => {
        front = !front;
        side.textContent = front ? 'QUESTION' : 'ANSWER';
        side.style.color = front ? '#7c5cf7' : '#00b894';
        txt.textContent = front ? (cards[idx].front || '') : (cards[idx].back || '');
        card.style.borderColor = front ? '#1a1a34' : '#00b89430';
    });
    const nav = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' });
    const bs: Partial<CSSStyleDeclaration> = { padding: '5px 12px', fontSize: '10px', fontWeight: '600', border: '1px solid #1a1a34', borderRadius: '5px', background: '#0c0c18', color: '#666', cursor: 'pointer' };
    const p = el('button', bs, '←'); const cnt = el('span', { fontSize: '10px', color: '#444' }, `1/${cards.length}`); const n = el('button', bs, '→');
    p.addEventListener('click', () => { if (idx > 0) { idx--; upd(); } });
    n.addEventListener('click', () => { if (idx < cards.length - 1) { idx++; upd(); } });
    nav.appendChild(p); nav.appendChild(cnt); nav.appendChild(n);
    sec.appendChild(card);
    sec.appendChild(el('div', { fontSize: '9px', color: '#333', textAlign: 'center', marginTop: '5px' }, 'Tap to flip'));
    sec.appendChild(nav);
    area.appendChild(sec);
}

function renderLinks(area: HTMLElement, data: any, sources: string[]) {
    const sec = el('div', { padding: '4px 14px 14px' });
    const topicName = data?.topic || 'Topic';

    // ── Search Bar ───────────────────────────────
    const searchWrap = el('div', {
        display: 'flex', gap: '6px', marginBottom: '14px',
    });
    const searchInput = el('input', {
        flex: '1', padding: '9px 12px', background: '#111125',
        border: '1px solid #1a1a34', borderRadius: '8px',
        color: '#ddd', fontSize: '11px', outline: 'none',
    });
    searchInput.setAttribute('placeholder', `Search resources... e.g. "trig derivatives"`);
    searchInput.addEventListener('focus', () => { searchInput.style.borderColor = '#7c5cf7'; });
    searchInput.addEventListener('blur', () => { searchInput.style.borderColor = '#1a1a34'; });

    const searchBtn = el('button', {
        padding: '9px 14px', background: '#7c5cf7', border: 'none',
        borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700',
        cursor: 'pointer', flexShrink: '0',
    }, '▸');
    searchBtn.addEventListener('click', () => {
        const query = (searchInput as HTMLInputElement).value;
        if (!query.trim()) return;
        // Mockup: show custom results
        let customSec = document.getElementById('eduai-custom-results');
        if (customSec) customSec.remove();
        customSec = el('div', { marginBottom: '14px' });
        customSec.id = 'eduai-custom-results';
        customSec.appendChild(lbl(`Results for "${query}"`));
        [
            { title: `${query} — Complete Tutorial`, source: 'Khan Academy', type: 'video' },
            { title: `Practice: ${query}`, source: 'Khan Academy', type: 'exercise' },
            { title: `${query} Explained`, source: 'YouTube', type: 'video' },
        ].forEach(item => {
            const card = el('div', {
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                background: '#111130', borderRadius: '8px', border: '1px solid #7c5cf730',
                marginBottom: '5px', cursor: 'pointer',
            });
            card.appendChild(el('span', { fontSize: '13px', flexShrink: '0' }, item.type === 'video' ? '▶' : '✎'));
            const info = el('div', { flex: '1' });
            info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd' }, item.title));
            info.appendChild(el('div', { fontSize: '8px', color: '#7c5cf7', marginTop: '2px' }, item.source));
            card.appendChild(info);
            customSec!.appendChild(card);
        });
        // Insert after search bar
        searchWrap.after(customSec);
    });
    (searchInput as HTMLInputElement).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(searchBtn);
    sec.appendChild(searchWrap);

    // ── Difficulty Toggle ────────────────────────
    const diffWrap = el('div', {
        display: 'flex', gap: '0px', marginBottom: '14px',
        borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a34',
    });
    const diffs = [
        { id: 'all', label: 'All' },
        { id: 'beginner', label: 'Beginner' },
        { id: 'intermediate', label: 'Intermediate' },
        { id: 'advanced', label: 'Advanced' },
    ];
    diffs.forEach(d => {
        const pill = el('button', {
            flex: '1', padding: '6px 0', background: d.id === 'all' ? '#7c5cf7' : '#111125',
            color: d.id === 'all' ? '#fff' : '#555', border: 'none',
            fontSize: '9px', fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.3px',
        }, d.label);
        pill.addEventListener('click', () => {
            diffWrap.querySelectorAll('button').forEach(b => {
                (b as HTMLElement).style.background = '#111125';
                (b as HTMLElement).style.color = '#555';
            });
            pill.style.background = '#7c5cf7';
            pill.style.color = '#fff';
        });
        diffWrap.appendChild(pill);
    });
    sec.appendChild(diffWrap);

    // ── Study Time ───────────────────────────────
    const timeCard = el('div', {
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
        background: '#111125', borderRadius: '8px', border: '1px solid #1a1a34',
        marginBottom: '14px',
    });
    timeCard.appendChild(el('span', { fontSize: '16px' }, '⏱'));
    const timeInfo = el('div', { flex: '1' });
    timeInfo.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd' }, `23 minutes studying ${topicName}`));
    timeInfo.appendChild(el('div', { fontSize: '8px', color: '#444', marginTop: '2px' }, 'Across 2 pages · 14 sections read'));
    timeCard.appendChild(timeInfo);
    sec.appendChild(timeCard);

    // ── Helper: removable card ───────────────────
    function makeRemovableCard(cardEl: HTMLElement) {
        cardEl.style.position = 'relative';
        const removeBtn = el('span', {
            position: 'absolute', top: '50%', right: '8px',
            fontSize: '10px', color: '#333', cursor: 'pointer',
            padding: '5px', borderRadius: '4px',
            transition: 'color 0.15s, background 0.15s',
            lineHeight: '1', transform: 'translateY(-50%)'
        }, '✕');
        removeBtn.addEventListener('mouseenter', () => { removeBtn.style.color = '#ff6b6b'; removeBtn.style.background = '#2a1a1a'; });
        removeBtn.addEventListener('mouseleave', () => { removeBtn.style.color = '#333'; removeBtn.style.background = 'transparent'; });
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cardEl.style.opacity = '0.3';
            cardEl.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                // Replace with "finding better resource..." placeholder
                const placeholder = el('div', {
                    padding: '10px 12px', background: '#0e0e22', borderRadius: '8px',
                    border: '1px dashed #1a1a34', marginBottom: '6px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                });
                placeholder.appendChild(el('div', {
                    width: '12px', height: '12px', border: '2px solid #1a1a34', borderTop: '2px solid #7c5cf7',
                    borderRadius: '50%',
                }));
                (placeholder.lastChild as HTMLElement).className = 'eduai-spinner';
                placeholder.appendChild(el('span', { fontSize: '10px', color: '#444' }, 'Finding a better resource...'));
                cardEl.replaceWith(placeholder);

                // Simulate replacement after 1.5s
                setTimeout(() => {
                    const replacement = el('div', {
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                        background: '#111130', borderRadius: '8px', border: '1px solid #7c5cf730',
                        marginBottom: '6px', cursor: 'pointer',
                    });
                    replacement.appendChild(el('span', { fontSize: '13px', flexShrink: '0' }, '✦'));
                    const rInfo = el('div', { flex: '1' });
                    rInfo.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd' }, `Alternative: ${topicName} Deep Dive`));
                    rInfo.appendChild(el('div', { fontSize: '8px', color: '#7c5cf7', marginTop: '2px' }, 'AI Recommended'));
                    replacement.appendChild(rInfo);
                    placeholder.replaceWith(replacement);
                }, 1500);
            }, 300);
        });
        cardEl.appendChild(removeBtn);
    }

    // ── Pages Studied ────────────────────────────
    if (sources && sources.length > 0) {
        sec.appendChild(lbl('Pages You\'ve Studied'));
        sources.forEach(url => {
            let host = url, path = '';
            try { const u = new URL(url); host = u.hostname; path = u.pathname; } catch {}
            const display = (host + path).length > 42 ? (host + path).substring(0, 42) + '…' : host + path;
            const link = el('a', {
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                background: '#111125', borderRadius: '8px', color: '#3b82f6', fontSize: '11px',
                fontWeight: '500', textDecoration: 'none', border: '1px solid #1a1a34',
                marginBottom: '6px', transition: 'border-color 0.15s, background 0.15s',
            });
            link.appendChild(el('span', { fontSize: '14px', flexShrink: '0' }, '🔗'));
            const info = el('div', { flex: '1', overflow: 'hidden' });
            info.appendChild(el('div', { fontSize: '11px', color: '#99b', whiteSpace: 'normal',
            overflow: 'visible',
            textOverflow: 'unset',
            lineHeight: '1.3', }, display));
            info.appendChild(el('div', { fontSize: '8px', color: '#333', marginTop: '2px' }, 'Visited'));
            link.appendChild(info);
            link.setAttribute('href', url);
            link.setAttribute('target', '_blank');
            link.addEventListener('mouseenter', () => { link.style.borderColor = '#3b82f640'; link.style.background = '#141430'; });
            link.addEventListener('mouseleave', () => { link.style.borderColor = '#1a1a34'; link.style.background = '#111125'; });
            sec.appendChild(link);
        });
        sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));
    }

    // ── Khan Academy ─────────────────────────────
    const khan = collapsibleSection('Khan Academy', false);
    const khanItems = [
        { type: 'video', title: `Introduction to ${topicName}`, duration: '12:34', unit: 'AP Calculus AB · Unit 2' },
        { type: 'video', title: `${topicName} — Worked Examples`, duration: '8:21', unit: 'AP Calculus AB · Unit 2' },
        { type: 'exercise', title: `Practice: Basic ${topicName}`, questions: '7 questions', unit: 'AP Calculus AB · Unit 2' },
        { type: 'exercise', title: `${topicName} Challenge Problems`, questions: '4 questions', unit: 'AP Calculus AB · Unit 2' },
    ];
    khanItems.forEach(item => {
        const card = el('div', {
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            background: '#111125', borderRadius: '8px', border: '1px solid #1a1a34',
            marginBottom: '6px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        });
        const icon = el('div', {
            width: '32px', height: '32px', borderRadius: '6px', flexShrink: '0',
            background: item.type === 'video' ? '#1b5e3b' : '#1a3a6b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
        }, item.type === 'video' ? '▶' : '✎');
        const info = el('div', { flex: '1', overflow: 'hidden' });
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd',whiteSpace: 'normal',
                    overflow: 'visible',
                    textOverflow: 'unset',
                    lineHeight: '1.3', }, item.title));
        const meta = el('div', { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' });
        meta.appendChild(el('span', { fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '6px', background: item.type === 'video' ? '#1b5e3b40' : '#1a3a6b40', color: item.type === 'video' ? '#4ade80' : '#60a5fa', textTransform: 'uppercase' }, item.type === 'video' ? 'Video' : 'Exercise'));
        meta.appendChild(el('span', { fontSize: '8px', color: '#444' }, item.type === 'video' ? item.duration! : item.questions!));
        meta.appendChild(el('span', { fontSize: '8px', color: '#333' }, '·'));
        meta.appendChild(el('span', { fontSize: '8px', color: '#333' }, item.unit));
        info.appendChild(meta);
        card.appendChild(icon);
        card.appendChild(info);
        makeRemovableCard(card);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#2a4a2a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        khan.content.appendChild(card);
    });
    sec.appendChild(khan.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));

    // ── YouTube ──────────────────────────────────
    const yt = collapsibleSection('YouTube', false);
    const ytItems = [
        { title: `${topicName} — Full Lecture`, channel: 'Professor Leonard', views: '2.1M views', thumb: 'https://img.youtube.com/vi/WUvTyaaNkzM/mqdefault.jpg' },
        { title: `${topicName} Explained Simply`, channel: '3Blue1Brown', views: '4.8M views', thumb: 'https://img.youtube.com/vi/9vKqVkMQHKk/mqdefault.jpg' },
        { title: `${topicName} in 10 Minutes`, channel: 'Organic Chemistry Tutor', views: '1.3M views', thumb: 'https://img.youtube.com/vi/HfACrKJ_Y2w/mqdefault.jpg' },
    ];
    ytItems.forEach(item => {
        const card = el('div', {
            display: 'flex', gap: '10px', padding: '8px', background: '#111125',
            borderRadius: '8px', border: '1px solid #1a1a34', marginBottom: '6px',
            cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        });
        const thumbWrap = el('div', { width: '80px', height: '50px', borderRadius: '5px', overflow: 'hidden', flexShrink: '0', background: '#0a0a15' });
        const thumbImg = document.createElement('img');
        thumbImg.src = item.thumb;
        thumbImg.style.width = '100%'; thumbImg.style.height = '100%'; thumbImg.style.objectFit = 'cover'; thumbImg.style.borderRadius = '5px';
        thumbImg.onerror = () => { thumbWrap.textContent = ''; thumbWrap.appendChild(el('div', { width: '100%', height: '100%', background: '#1a1a34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#333' }, '▶')); };
        thumbWrap.appendChild(thumbImg);
        const info = el('div', { flex: '1', overflow: 'hidden', paddingTop: '2px' });
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd', whiteSpace: 'normal',
            overflow: 'visible',
            textOverflow: 'unset',
            lineHeight: '1.3',}, item.title));
        info.appendChild(el('div', { fontSize: '9px', color: '#ff6b6b', marginTop: '3px', fontWeight: '600' }, item.channel));
        info.appendChild(el('div', { fontSize: '8px', color: '#444', marginTop: '1px' }, item.views));
        card.appendChild(thumbWrap);
        card.appendChild(info);
        makeRemovableCard(card);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#4a2a2a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        yt.content.appendChild(card);
    });
    sec.appendChild(yt.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));

    // ── Quizlet ──────────────────────────────────
    const quizlet = collapsibleSection('Quizlet', false);
    const quizletItems = [
        { title: `${topicName} — Key Terms & Definitions`, cards: '42 terms', author: 'StudyPro' },
        { title: `AP Calculus: ${topicName}`, cards: '28 terms', author: 'MathMaster' },
    ];
    quizletItems.forEach(item => {
        const card = el('div', {
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            background: '#111125', borderRadius: '8px', border: '1px solid #1a1a34',
            marginBottom: '6px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        });
        card.appendChild(el('div', { width: '32px', height: '32px', borderRadius: '6px', flexShrink: '0', background: '#1a3a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#4ecdc4' }, '📚'));
        const info = el('div', { flex: '1', overflow: 'hidden' });
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd', whiteSpace: 'normal',
        overflow: 'visible',
        textOverflow: 'unset',
        lineHeight: '1.3', }, item.title));
        const meta = el('div', { display: 'flex', gap: '6px', marginTop: '3px' });
        meta.appendChild(el('span', { fontSize: '8px', color: '#4ecdc4', fontWeight: '600' }, item.cards));
        meta.appendChild(el('span', { fontSize: '8px', color: '#333' }, `by ${item.author}`));
        info.appendChild(meta);
        card.appendChild(info);
        makeRemovableCard(card);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#2a4a4a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        quizlet.content.appendChild(card);
    });
    sec.appendChild(quizlet.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));

    // ── Research & Deep Dives ────────────────────
    const research = collapsibleSection('Research & Deep Dives', false);
    const papers = [
        { title: `A Survey of Modern Approaches to ${topicName}`, authors: 'J. Smith, A. Chen', year: '2023', source: 'arXiv', tag: 'Survey' },
        { title: `${topicName}: Foundations and Applications`, authors: 'R. Patel et al.', year: '2022', source: 'JSTOR', tag: 'Textbook' },
        { title: `Teaching ${topicName}: A Pedagogical Perspective`, authors: 'M. Williams', year: '2024', source: 'Google Scholar', tag: 'Education' },
    ];
    papers.forEach(item => {
        const card = el('div', {
            padding: '10px 12px', background: '#111125', borderRadius: '8px',
            border: '1px solid #1a1a34', marginBottom: '6px', cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
        });
        const titleRow = el('div', { display: 'flex', alignItems: 'flex-start', gap: '8px' });
        titleRow.appendChild(el('span', { fontSize: '12px', color: '#666', flexShrink: '0', marginTop: '1px' }, '📄'));
        titleRow.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ccc', lineHeight: '1.4' }, item.title));
        card.appendChild(titleRow);
        const meta = el('div', { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', paddingLeft: '20px' });
        meta.appendChild(el('span', { fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '6px', background: '#2a1a3a', color: '#a78bfa', textTransform: 'uppercase' }, item.tag));
        meta.appendChild(el('span', { fontSize: '8px', color: '#555' }, item.authors));
        meta.appendChild(el('span', { fontSize: '8px', color: '#333' }, `${item.year} · ${item.source}`));
        card.appendChild(meta);
        makeRemovableCard(card);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#2a2a4a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        research.content.appendChild(card);
    });
    sec.appendChild(research.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));

    // ── Haven't Explored Yet ─────────────────────
    
    const explore = collapsibleSection('📍 Haven\'t Explored Yet', false);

    const gaps = [
        { name: 'Implicit Differentiation', reason: 'Key technique in Calculus' },
        { name: 'Related Rates', reason: 'Application of derivatives' },
        { name: 'L\'Hôpital\'s Rule', reason: 'Uses derivatives for limits' },
        { name: 'Taylor Series', reason: 'Builds on derivative concepts' },
    ];
    gaps.forEach(gap => {
        const card = el('div', {
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            background: '#0e0e22', borderRadius: '8px', border: '1px dashed #1e1e3a',
            marginBottom: '5px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        });
        card.appendChild(el('div', {
            width: '6px', height: '6px', borderRadius: '50%', background: '#fdcb6e',
            flexShrink: '0',
        }));
        const info = el('div', { flex: '1' });
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#aaa' }, gap.name));
        info.appendChild(el('div', { fontSize: '8px', color: '#444', marginTop: '2px' }, gap.reason));
        card.appendChild(info);
        card.appendChild(el('span', {
            fontSize: '8px', color: '#7c5cf7', fontWeight: '700', padding: '2px 6px',
            borderRadius: '6px', background: '#7c5cf715', flexShrink: '0',
        }, 'Explore'));
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#7c5cf740'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1e1e3a'; card.style.background = '#0e0e22'; });
        explore.content.appendChild(card);
    });
    sec.appendChild(explore.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));

    // ── Practice Problems ────────────────────────
    const practice = collapsibleSection('Practice Problems', true);
    const practiceWrap = el('div', { marginBottom: '14px' });

    const generateBtn = el('button', {
        width: '100%', padding: '10px', background: '#111125',
        border: '1px dashed #1a1a34', borderRadius: '8px',
        color: '#7c5cf7', fontSize: '11px', fontWeight: '700',
        cursor: 'pointer', transition: 'all 0.15s', marginBottom: '8px',
    }, '✦  Generate Practice Problems');
    generateBtn.addEventListener('mouseenter', () => { generateBtn.style.background = '#1a1a3a'; generateBtn.style.borderColor = '#7c5cf7'; });
    generateBtn.addEventListener('mouseleave', () => { generateBtn.style.background = '#111125'; generateBtn.style.borderColor = '#1a1a34'; });
    generateBtn.addEventListener('click', () => {
        generateBtn.textContent = '⟳ Generating...';
        generateBtn.style.opacity = '0.6';
        // Mockup: show problems after delay
        setTimeout(() => {
            generateBtn.style.display = 'none';
            const problems = [
                { q: `Find the derivative of f(x) = 3x⁴ - 2x² + 7x - 1`, a: `f'(x) = 12x³ - 4x + 7`, difficulty: 'Easy' },
                { q: `Differentiate g(x) = sin(x²) using the chain rule`, a: `g'(x) = 2x·cos(x²)`, difficulty: 'Medium' },
                { q: `Find dy/dx if y = (2x+1)/(x²-3)`, a: `dy/dx = (-2x² - 2x - 6) / (x²-3)²`, difficulty: 'Medium' },
                { q: `Find the second derivative of h(x) = ln(x³ + 1)`, a: `h''(x) = (3x(2-x³)) / (x³+1)²`, difficulty: 'Hard' },
            ];

            const refreshBtn = el('button', {
                width: '100%', padding: '8px', background: 'transparent',
                border: '1px solid #1a1a34', borderRadius: '8px',
                color: '#7c5cf7', fontSize: '10px', fontWeight: '700',
                cursor: 'pointer', transition: 'all 0.15s', marginTop: '4px', display: 'hidden'
            }, '↻  Generate More');
            refreshBtn.addEventListener('mouseenter', () => { refreshBtn.style.background = '#1a1a3a'; refreshBtn.style.borderColor = '#7c5cf7'; });
            refreshBtn.addEventListener('mouseleave', () => { refreshBtn.style.background = 'transparent'; refreshBtn.style.borderColor = '#1a1a34'; });
            refreshBtn.addEventListener('click', () => {
                // Clear existing problems
                while (practiceWrap.firstChild) practiceWrap.removeChild(practiceWrap.firstChild);
                // Re-show generate button and trigger it
                generateBtn.style.display = 'block';
                generateBtn.style.opacity = '1';
                generateBtn.textContent = '✦  Generate Practice Problems';
                practiceWrap.appendChild(generateBtn);
                generateBtn.click();
            });
            
            practiceWrap.appendChild(refreshBtn);
            
            problems.forEach((p, i) => {
                const problemCard = el('div', {
                    padding: '12px', background: '#111125', borderRadius: '8px',
                    border: '1px solid #1a1a34', marginBottom: '6px',
                    cursor: 'pointer', transition: 'border-color 0.15s',
                });
                const header = el('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' });
                header.appendChild(el('span', {
                    fontSize: '10px', fontWeight: '700', color: '#7c5cf7',
                    background: '#7c5cf715', padding: '2px 6px', borderRadius: '6px',
                }, `#${i + 1}`));
                header.appendChild(el('span', {
                    fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '6px',
                    background: p.difficulty === 'Easy' ? '#1b5e3b40' : p.difficulty === 'Medium' ? '#6b5a1a40' : '#5e1b1b40',
                    color: p.difficulty === 'Easy' ? '#4ade80' : p.difficulty === 'Medium' ? '#fbbf24' : '#f87171',
                    textTransform: 'uppercase',
                }, p.difficulty));
                problemCard.appendChild(header);

                problemCard.appendChild(el('div', {
                    fontSize: '12px', color: '#ddd', lineHeight: '1.5', marginBottom: '8px',
                }, p.q));

                const answerWrap = el('div', {
                    display: 'none', padding: '10px', background: '#0e0e1e',
                    borderRadius: '6px', borderLeft: '2px solid #00b894',
                });
                answerWrap.appendChild(el('div', { fontSize: '8px', color: '#00b894', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }, 'Solution'));
                answerWrap.appendChild(el('div', { fontSize: '11px', color: '#aaa', lineHeight: '1.5' }, p.a));
                problemCard.appendChild(answerWrap);

                const showBtn = el('div', {
                    fontSize: '9px', color: '#555', cursor: 'pointer', fontWeight: '600',
                    transition: 'color 0.15s',
                }, '▸ Show Solution');
                showBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const visible = answerWrap.style.display !== 'none';
                    answerWrap.style.display = visible ? 'none' : 'block';
                    showBtn.textContent = visible ? '▸ Show Solution' : '▾ Hide Solution';
                    showBtn.style.color = visible ? '#555' : '#7c5cf7';
                });
                showBtn.addEventListener('mouseenter', () => { showBtn.style.color = '#7c5cf7'; });
                showBtn.addEventListener('mouseleave', () => { if (answerWrap.style.display === 'none') showBtn.style.color = '#555'; });
                problemCard.appendChild(showBtn);

                problemCard.addEventListener('mouseenter', () => { problemCard.style.borderColor = '#2a2a4a'; });
                problemCard.addEventListener('mouseleave', () => { problemCard.style.borderColor = '#1a1a34'; });
                practiceWrap.appendChild(problemCard);
            });

            
            
        }, 1200);
    });
    
    practiceWrap.appendChild(generateBtn);
    practice.content.appendChild(practiceWrap);
    sec.appendChild(practice.wrapper);

    addScrollIndicators(sec);
    area.appendChild(sec);
}

function collapsibleSection(labelText: string, defaultOpen: boolean = false): { wrapper: HTMLElement, content: HTMLElement } {
    const wrapper = el('div', { marginBottom: '6px' });
    
    const header = el('div', {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 0', cursor: 'pointer', transition: 'opacity 0.15s'
    });
    
    const arrow = el('span', {
        fontSize: '12px', color: '#555', transition: 'transform 0.2s, color 0.2s',
        display: 'inline-block',
    }, defaultOpen ? '▾' : '▸');
    
    const labelEl = el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#444',
    }, labelText);
    
    header.appendChild(arrow);
    header.appendChild(labelEl);
    
    const content = el('div', {
        display: defaultOpen ? 'block' : 'none',
        transition: 'all 0.15s ease',
    });
    
    header.addEventListener('mouseenter', () => { labelEl.style.color = '#888'; });
    header.addEventListener('mouseleave', () => { labelEl.style.color = '#444'; });
    header.addEventListener('click', () => {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        arrow.textContent = isOpen ? '▸' : '▾';
        arrow.style.color = isOpen ? '#555' : '#7c5cf7';
    });
    
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    
    return { wrapper, content };
}

function addScrollIndicators(sec: HTMLElement) {
    // Wait for DOM to settle
    setTimeout(() => {
        const scrollParent = contentArea
        if (!scrollParent) return;

        // Bottom indicator
        const bottomPill = el('div', {
            position: 'sticky', bottom: '0', left: '0', right: '0',
            padding: '6px 12px', margin: '0 -14px',
            background: 'linear-gradient(transparent, #0c0c18 30%)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            pointerEvents: 'none', zIndex: '10',
        });
        const bottomInner = el('div', {
            padding: '8px 16px', background: '#1e1e40', borderRadius: '16px',
            border: '1px solid #7c5cf740', fontSize: '12px', color: '#ccc',
            display: 'flex', alignItems: 'center', gap: '6px',
            pointerEvents: 'auto', cursor: 'pointer',
            boxShadow: '0 -6px 24px rgba(124,92,247,0.15)',
            transition: 'opacity 0.2s, transform 0.2s',
            fontWeight: '600',
        });
        bottomPill.appendChild(bottomInner);

        // Top indicator  
        const topPill = el('div', {
            position: 'sticky', top: '0', left: '0', right: '0',
            padding: '6px 12px', margin: '0 -14px',
            background: 'linear-gradient(#0c0c18 30%, transparent)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            pointerEvents: 'none', zIndex: '10',
        });
        const topInner = el('div', {
            padding: '8px 16px', background: '#1e1e40', borderRadius: '16px',
            border: '1px solid #7c5cf740', fontSize: '12px', color: '#ccc',
            display: 'flex', alignItems: 'center', gap: '6px',
            pointerEvents: 'auto', cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(124,92,247,0.15)',
            transition: 'opacity 0.2s, transform 0.2s',
            fontWeight: '600',
        });
        topPill.appendChild(topInner);

        // Collect all section labels
        const sections: { label: string, el: HTMLElement }[] = [];
        sec.querySelectorAll('div').forEach(d => {
            const div = d as HTMLElement;
            if (div.style.textTransform === 'uppercase' && div.style.letterSpacing === '1.2px') {
                const text = div.textContent?.replace(/^[^\w]*/, '').trim() || '';
                if (text) sections.push({ label: text, el: div });
            }
        });

        function updateIndicators() {
            const containerRect = scrollParent.getBoundingClientRect();
            const viewTop = containerRect.top;
            const viewBottom = containerRect.bottom;

            const above: string[] = [];
            const below: string[] = [];

            sections.forEach(s => {
                const rect = s.el.getBoundingClientRect();
                if (rect.bottom < viewTop + 60) above.push(s.label);
                else if (rect.top > viewBottom - 40) below.push(s.label);
            });

            if (below.length > 0) {
                const text = below.length <= 2 ? below.join(', ') : `${below[0]}, ${below[1]} +${below.length - 2} more`;
                bottomInner.textContent = '';
                bottomInner.appendChild(el('span', { color: '#7c5cf7', fontSize: '14px' , fontWeight: '800'}, '▾'));
                bottomInner.appendChild(el('span', {}, text));
                bottomPill.style.display = 'flex';
            } else {
                bottomPill.style.display = 'none';
            }

            if (above.length > 0) {
                const text = above.length <= 2 ? above.join(', ') : `${above[0]}, ${above[1]} +${above.length - 2} more`;
                topInner.textContent = '';
                topInner.appendChild(el('span', { color: '#7c5cf7', fontSize: '14px', fontWeight: '800' }, '▴'));
                topInner.appendChild(el('span', {}, text));
                topPill.style.display = 'flex';
            } else {
                topPill.style.display = 'none';
            }
        }

        // Click to scroll
        bottomInner.addEventListener('click', () => {
            const below = sections.filter(s => {
                const r = s.el.getBoundingClientRect();
                return r.top > window.innerHeight * 0.5;
            });
            if (below.length > 0) below[0].el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        topInner.addEventListener('click', () => {
            const above = sections.filter(s => {
                const r = s.el.getBoundingClientRect();
                return r.bottom < 100;
            });
            if (above.length > 0) above[above.length - 1].el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // Insert indicators
        sec.insertBefore(topPill, sec.firstChild);
        sec.appendChild(bottomPill);

        // Listen to scroll
        contentArea.addEventListener('scroll', updateIndicators);
        updateIndicators();
    }, 100);
}
 
 
// ─── Loader ──────────────────────────────────────────────────
function showLoader(area: HTMLElement): HTMLElement {
    const w = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '10px' });
    const s = el('div', { width: '20px', height: '20px', border: '2px solid #1a1a34', borderTop: '2px solid #7c5cf7', borderRadius: '50%' });
    s.className = 'eduai-spinner';
    w.appendChild(s); w.appendChild(el('span', { fontSize: '10px', color: '#333' }, 'Analyzing…'));
    area.appendChild(w);
    return w;
}
 
// ─── Knowledge Map Modal ─────────────────────────────────────
function getMasteryColor(s: number): string {
    if (s >= 85) return '#00b894'; if (s >= 65) return '#7c5cf7';
    if (s >= 40) return '#fdcb6e'; if (s >= 16) return '#e17055'; return '#636e72';
}
 
function renderTreeNode(concept: any, depth: number): HTMLDivElement {
    const w = el('div', { marginLeft: depth > 0 ? '12px' : '0px' });
    const has = concept.children && concept.children.length > 0;
    let open = false;
    const row = el('div', { display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '4px', cursor: has ? 'pointer' : 'default', marginBottom: '1px' });
    row.appendChild(el('div', { width: '2px', height: '14px', borderRadius: '1px', background: getMasteryColor(concept.mastery_score || 0) }));
    const arr = el('span', { fontSize: '8px', color: '#333', width: '10px', textAlign: 'center' }, has ? '▶' : '·');
    row.appendChild(arr);
    row.appendChild(el('span', { fontSize: depth === 0 ? '12px' : '11px', fontWeight: depth === 0 ? '700' : '400', color: depth === 0 ? '#fff' : '#888', flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, concept.name));
    row.appendChild(el('span', { fontSize: '8px', color: '#2a2a4a' }, `×${concept.times_encountered || 0}`));
    row.addEventListener('mouseenter', () => { row.style.background = '#111125'; });
    row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
    w.appendChild(row);
    const kids = el('div', { display: 'none', borderLeft: '1px solid #161630', marginLeft: '6px', paddingLeft: '3px' });
    if (has) {
        concept.children.forEach((c: any) => kids.appendChild(renderTreeNode(c, depth + 1)));
        row.addEventListener('click', () => { open = !open; kids.style.display = open ? 'block' : 'none'; arr.textContent = open ? '▼' : '▶'; arr.style.color = open ? '#7c5cf7' : '#333'; });
    }
    w.appendChild(kids);
    return w;
}
 
async function renderKnowledgeMap() {
    const ov = el('div', { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: '99999', display: 'flex', justifyContent: 'center', alignItems: 'center' });
    const modal = el('div', { width: '480px', maxWidth: '90vw', maxHeight: '80vh', background: '#0c0c18', borderRadius: '12px', border: '1px solid #161630', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' });
    modal.className = 'eduai-modal';
    const hdr = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #161630' });
    hdr.appendChild(el('span', { fontSize: '13px', fontWeight: '700', color: '#fff' }, '🧠 Knowledge Map'));
    const x = el('button', { background: 'none', border: '1px solid #1e1e3a', borderRadius: '4px', color: '#555', fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }, '✕');
    x.addEventListener('click', () => document.body.removeChild(ov));
    ov.addEventListener('click', (e) => { if (e.target === ov) document.body.removeChild(ov); });
    hdr.appendChild(x); modal.appendChild(hdr);
    const leg = el('div', { display: 'flex', gap: '8px', padding: '6px 16px', borderBottom: '1px solid #111125', flexWrap: 'wrap' });
    [['#00b894','Mastered'],['#7c5cf7','Reviewing'],['#fdcb6e','Learning'],['#e17055','Weak'],['#636e72','New']].forEach(([c,l]) => {
        const i = el('div', { display: 'flex', alignItems: 'center', gap: '3px' });
        i.appendChild(el('div', { width: '5px', height: '5px', borderRadius: '50%', background: c }));
        i.appendChild(el('span', { fontSize: '9px', color: '#444' }, l));
        leg.appendChild(i);
    });
    modal.appendChild(leg);
    const body = el('div', { flex: '1', padding: '12px 16px', overflowY: 'auto' });
    modal.appendChild(body); ov.appendChild(modal); document.body.appendChild(ov);
    const loader = showLoader(body);
    try {
        const res = await fetch('http://localhost:8000/knowledge/graph');
        const data = await res.json();
        if (loader.parentNode) loader.parentNode.removeChild(loader);
        const roots = Object.values(data);
        if (!roots.length) { body.appendChild(el('p', { fontSize: '11px', color: '#333', textAlign: 'center', padding: '30px 0' }, 'No concepts yet.')); return; }
        let tot = 0; function cnt(n: any) { tot++; (n.children||[]).forEach(cnt); } roots.forEach(r => cnt(r));
        const st = el('div', { display: 'flex', gap: '10px', marginBottom: '10px', padding: '6px 10px', background: '#111125', borderRadius: '6px' });
        st.appendChild(el('span', { fontSize: '10px', color: '#444' }, `${roots.length} topics`));
        st.appendChild(el('span', { fontSize: '10px', color: '#444' }, `${tot} concepts`));
        body.appendChild(st);
        roots.forEach((r: any) => body.appendChild(renderTreeNode(r, 0)));
    } catch { if (loader.parentNode) loader.parentNode.removeChild(loader); body.appendChild(el('p', { color: '#e17055', fontSize: '11px', textAlign: 'center' }, 'Failed to load.')); }
}
 
// ─── Content Extraction (UNCHANGED) ──────────────────────────
function extractWithReadability() {
    const title = document.title;
    const full_url = window.location.href;
    const hostname = window.location.hostname;
    const path_name = window.location.pathname;
    const clone = document.cloneNode(true) as Document;
    const reader = new Readability(clone);
    const article = reader.parse();
    const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, a, blockquote, pre, code');
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
            const e = entry.target as HTMLElement;
            if (entry.isIntersecting) currentlyVisible.add(e);
            if (!entry.isIntersecting) {
                if (viewportTimers.has(e)) { flushViewport(Date.now(), e, false); observer.unobserve(e); }
                currentlyVisible.delete(e);
            }
        });
    };
    const observer = new IntersectionObserver(observerCallback, { root: null, rootMargin: '-5% 0px -40% 0px', threshold: 0.5 });
    contentElements.forEach(element => {
        const h = element as HTMLElement;
        const tl = h.innerText.length;
        if (tl === 0) return;
        const cl = Array.from(h.children).reduce((a, c) => a + ((c as HTMLElement).innerText?.length || 0), 0);
        const pct = cl / tl * 100;
        if (!h.closest('#eduai-sidebar') && !h.closest('nav, footer, header, aside') && !h.closest('[role="navigation"], [role="banner"], [role="contentinfo"]') && tl >= 30 && pct <= 60) observer.observe(h);
    });
    return { title, full_url, hostname, path_name, textContent: article ? article.textContent : undefined };
}
 
// ─── Initialize ──────────────────────────────────────────────
function initialize() {
    if (document.getElementById('eduai-sidebar')) return;
    const sidebar = createSidebar();
    const metadata = extractWithReadability();
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
    contentArea = el('div', { flex: '1', overflowY: 'auto' });
    sidebar.appendChild(contentArea);
    viewHome(metadata);
 
    fetch('http://localhost:8000/knowledge/graph').then(r => r.json()).then(data => { knowledgeTree = data; navigateTo(() => viewHome(metadata)); }).catch(() => {});
 
    let isAnalyzing = false;
    const onAnalyze = async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        const btn = document.getElementById('eduai-analyze-btn');
        if (btn) { btn.textContent = '⟳ Working…'; (btn as HTMLButtonElement).style.opacity = '0.6'; }
        clear(contentArea);
        const loader = showLoader(contentArea);
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
                } else { clear(contentArea); contentArea.appendChild(el('p', { padding: '20px', color: '#e17055', fontSize: '11px', textAlign: 'center' }, 'Parse error. Try again.')); }
            }
        } catch (err) { if (loader.parentNode) loader.parentNode.removeChild(loader); clear(contentArea); contentArea.appendChild(el('p', { padding: '20px', color: '#e17055', fontSize: '11px', textAlign: 'center' }, (err as Error).message)); }
        isAnalyzing = false;
        if (btn) { btn.textContent = '✦ Analyze'; (btn as HTMLButtonElement).style.opacity = '1'; }
        viewedContent.length = 0;
    };
 
    renderBottomBar(sidebar, onAnalyze);
    document.body.style.marginRight = '360px';
    document.body.appendChild(sidebar);
}
 
initialize();