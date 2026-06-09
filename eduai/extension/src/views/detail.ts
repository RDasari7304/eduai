import {renderSummary} from './sub-views/summary';
import {renderConcepts} from '../features/retrieve_concepts';
import {renderExplored} from './sub-views/explored';
import {renderLinks} from './sub-views/resources';
import {renderPracticeProblems} from '../features/generate_problems';
import { el, navigateTo, clear } from '../util/utils';
import { contentArea } from '../util/state';
import { viewHome } from './home';


export function viewDetail(topicName: string, subject: string, data: any, sources: string[], metadata: any) {
    // Back bar
    const back = el('div', {
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px',
        cursor: 'pointer', background: '#111125', borderBottom: '1px solid #1a1a34',
        transition: 'background 0.15s',
    });
    const bArr = el('span', { fontSize: '14px', color: '#7c5cf7', fontWeight: '600', transition: 'transform 0.15s ease', display: 'inline-block' }, '◂');
    const bLbl = el('span', { fontSize: '12px', fontWeight: '600', color: '#888' }, 'All Topics');
    back.appendChild(bArr); back.appendChild(bLbl);
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
    const liveData = { ...data };
 
    function buildChips() {
        const features = [
            { id: 'summary', label: '📝 Summary', fn: () => renderSummary(featureArea, liveData) },
            { id: 'concepts', label: '💡 Concepts', fn: () => renderConcepts(featureArea, liveData, topicName) },
            { id: 'practice', label: '🎯 Practice', fn: () => renderPracticeProblems(featureArea, topicName, liveData) },
            { id: 'links', label: '🔗 Resources', fn: () => renderLinks(featureArea, liveData, sources) },
            { id: 'explored', label: '🧭 Explored', fn: () => renderExplored(featureArea, liveData, sources, topicName) },
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
 
    if (liveData.summary) {
        (chipBar.querySelectorAll('button')[0] as HTMLElement).click();
    } else if (liveData.keyConcepts && liveData.keyConcepts.length > 0) {
        (chipBar.querySelectorAll('button')[1] as HTMLElement).click();
    }
 
    // Fetch stored analyses if needed
    if (!liveData.summary && sources.length > 0) {
        const urlParam = sources.map(u => encodeURIComponent(u)).join(',');
        fetch(`http://localhost:8000/knowledge/analyses?urls=${urlParam}`)
            .then(r => r.json())
            .then((analyses: any[]) => {
                if (!analyses || analyses.length === 0) return;
                const summaries: string[] = [];
                const allFlashcards: any[] = [];
                const allKeyConcepts: string[] = [];
                analyses.forEach((a: any) => {
                    if (a.summary) summaries.push(a.summary);
                    try { const fc = typeof a.flashcards === 'string' ? JSON.parse(a.flashcards) : (a.flashcards || []); allFlashcards.push(...fc); } catch {}
                    try { const kc = typeof a.key_concepts === 'string' ? JSON.parse(a.key_concepts) : (a.key_concepts || []); allKeyConcepts.push(...kc); } catch {}
                });
                if (summaries.length > 0) liveData.summary = summaries.join('\n\n');
                if (allFlashcards.length > 0) liveData.flashcards = allFlashcards;
                if (allKeyConcepts.length > 0) { liveData.keyConcepts = [...new Set([...(liveData.keyConcepts || []), ...allKeyConcepts])]; }
                const activeId = Object.keys(active).find(k => active[k]);
                if (activeId) {
                    clear(featureArea);
                    const fns: Record<string, () => void> = {
                        summary: () => renderSummary(featureArea, liveData),
                        concepts: () => renderConcepts(featureArea, liveData, topicName),
                        practice: () => renderPracticeProblems(featureArea, topicName, liveData),
                        links: () => renderLinks(featureArea, liveData, sources),
                        explored: () => renderExplored(featureArea, liveData, sources, topicName),
                    };
                    if (fns[activeId]) fns[activeId]();
                } else if (liveData.summary) {
                    (chipBar.querySelectorAll('button')[0] as HTMLElement).click();
                }
            })
            .catch(() => {});
    }
}
