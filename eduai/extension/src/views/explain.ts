import { setExplainModeActive, explainModeActive, setCurrHighlight, currHighlight, pageMetadata } from '../util/state';
import { el, navigateTo } from '../util/utils';
import {applyInlineFormatting, flattenKnowledge, renderMarkdown} from '../util/ui';
import { contentArea, knowledgeTree, FONT_FAMILY } from '../util/state';
import { viewHome } from './home';


const banner = el('div', {
    position: 'fixed', top: '0', left: '0', right: '360px',
    padding: '8px 0', background: 'linear-gradient(135deg, #7c5cf7, #3b82f6)',
    color: '#fff', fontSize: '12px', fontWeight: '600',
    textAlign: 'center', zIndex: '99998',
    letterSpacing: '0.3px',
    boxShadow: '0 2px 12px rgba(124,92,247,0.3)', fontFamily: FONT_FAMILY,
}, '✦  Explain Mode — click any element');

function toggleExplainMode(active: boolean, e: any) {  
    setExplainModeActive(active);
    if (active) {
        e.preventDefault();
        document.body.style.cursor = 'pointer';
        document.body.appendChild(banner);
    }else{
        document.body.removeChild(banner);
        resetHighlight()
        document.body.style.cursor = '';
    }
}

function resetHighlight() {
    if (!currHighlight) return;
    currHighlight.style.outline = '';
    currHighlight.style.outlineOffset = '';
    currHighlight.style.backgroundColor = '';
    currHighlight.style.borderRadius = '';
    currHighlight.style.cursor = '';
}

function highlightElement(el: HTMLElement) {
    if (!el) return;
    setCurrHighlight(el);
    el.style.outline = '2px dashed #7c5cf7';
    el.style.outlineOffset = '2px';
    el.style.backgroundColor = 'rgba(124, 92, 247, 0.06)';
    el.style.borderRadius = '4px';
    el.style.cursor = 'pointer';
}

export function initializeExplainMode() {
    document.addEventListener('keydown', (e) => {
        if (e.altKey && !explainModeActive ) {
            toggleExplainMode(true, e);
        }

        if (e.ctrlKey){
            e.preventDefault()
            const selection = window.getSelection()
            if (!selection || selection.isCollapsed){
                return
            }
            console.log(selection.toString().trim())
        }   
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Alt' && explainModeActive) {
            toggleExplainMode(false, e);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!explainModeActive) return;
        const hoveredEl = e.target as HTMLElement | null;
        if (!hoveredEl || hoveredEl.tagName?.toLowerCase() === 'body') return;
        const sidebar = document.getElementById('eduai-sidebar');
        if (sidebar?.contains(hoveredEl)) return;
        if (!hoveredEl.innerText || hoveredEl.innerText.length < 10) return;

        if (currHighlight !== hoveredEl) {
            resetHighlight();
        }

        highlightElement(hoveredEl);
    });

    document.addEventListener('click', async (e) => {
        if (!explainModeActive) return;
        const clickedEl = e.target as HTMLElement | null;
        if (!clickedEl || clickedEl.tagName?.toLowerCase() === 'body') return;
        const sidebar = document.getElementById('eduai-sidebar');
        if (sidebar?.contains(clickedEl)) return;
        if (!clickedEl.innerText || clickedEl.innerText.length < 10) return;
        e.preventDefault();
        e.stopPropagation();

        const { text, heading, context } = captureContext(clickedEl);
        console.log(`Text: ${text}\nHeading: ${heading}\nContext: ${context}`);

        navigateTo(() => viewExplain(text, heading, context, pageMetadata));
        toggleExplainMode(false, e);

    });

    function captureContext(clickedEl: HTMLElement): { text: string; heading: string; context: string } {
        const BLOCK_TAGS = ['P', 'LI', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'DD', 'DT', 'FIGCAPTION'];
        const HEADING_RE = /^H[1-6]$/;

        // Walk up to nearest block-level container
        function findAnchorBlock(el: HTMLElement): HTMLElement {
            let cur: HTMLElement | null = el;
            while (cur && cur !== document.body) {
                if (BLOCK_TAGS.includes(cur.tagName)) return cur;
                cur = cur.parentElement;
            }
            return el;
        }

        const anchor = findAnchorBlock(clickedEl);
        const text = anchor.innerText.trim();
        const anchorTop = anchor.getBoundingClientRect().top;

        // Collect ALL block elements in document order — no own-text filter
        // (that filter was dropping the anchor when it had inline children like <a>, <em>, <math>)
        const allBlocks = (Array.from(document.querySelectorAll('p,li,blockquote,pre,h1,h2,h3,h4,h5,h6,td,th,dd,dt,figcaption')) as HTMLElement[])
            .filter(el => {
                if (el.closest('#eduai-sidebar')) return false;
                const t = el.innerText?.trim();
                return !!t && t.length >= 10;
            });

        // Find current section bounds by position
        let currentHeading = '';
        let sectionStartIdx = 0;
        let sectionEndIdx = allBlocks.length;

        for (let i = allBlocks.length - 1; i >= 0; i--) {
            const el = allBlocks[i];
            if (HEADING_RE.test(el.tagName) && el.getBoundingClientRect().top <= anchorTop) {
                currentHeading = el.innerText.trim();
                sectionStartIdx = i + 1;
                break;
            }
        }
        for (let i = sectionStartIdx; i < allBlocks.length; i++) {
            if (HEADING_RE.test(allBlocks[i].tagName) && allBlocks[i].getBoundingClientRect().top > anchorTop) {
                sectionEndIdx = i;
                break;
            }
        }

        // Current section = everything between current heading and next heading
        const sectionBlocks = allBlocks.slice(sectionStartIdx, sectionEndIdx)
            .filter(el => el !== anchor);

        // Heavy weighting: take up to 8 section blocks, prioritize ones near the anchor
        const trim = (s: string) => s.length > 300 ? s.substring(0, 300) + '…' : s;
        const anchorIdx = sectionBlocks.findIndex(b => b.getBoundingClientRect().top > anchorTop);
        const splitAt = anchorIdx === -1 ? sectionBlocks.length : anchorIdx;
        const before = sectionBlocks.slice(Math.max(0, splitAt - 4), splitAt);
        const after = sectionBlocks.slice(splitAt, splitAt + 4);
        const context = [...before, ...after].map(b => trim(b.innerText.trim())).join('\n');

        return { text, heading: currentHeading, context };
    }
}


export async function viewExplain(text: string, heading: string, context: string, metadata: any, cached?: string) {
    const topicName = heading || 'Concept Explanation';

    // Back bar
    const back = el('div', {
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px',
        cursor: 'pointer', background: '#111125', borderBottom: '1px solid #1a1a34',
        transition: 'background 0.15s', fontFamily: FONT_FAMILY,
    });
    const bArr = el('span', { fontSize: '14px', color: '#7c5cf7', fontWeight: '600', transition: 'transform 0.15s ease', display: 'inline-block', fontFamily: FONT_FAMILY, }, '◂');
    const bLbl = el('span', { fontSize: '12px', fontWeight: '600', color: '#888', fontFamily: FONT_FAMILY, }, 'Back');
    back.appendChild(bArr); back.appendChild(bLbl);
    back.addEventListener('mouseenter', () => { back.style.background = '#1a1a3a'; bArr.style.transform = 'translateX(-3px)'; bLbl.style.color = '#fff'; });
    back.addEventListener('mouseleave', () => { back.style.background = '#111125'; bArr.style.transform = 'translateX(0)'; bLbl.style.color = '#888'; });
    back.addEventListener('click', () => navigateTo(() => viewHome(metadata)));
    contentArea.appendChild(back);

    // Topic header
    const hdr = el('div', { padding: '16px 14px 8px' , fontFamily: FONT_FAMILY,});
    const titleRow = el('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' });
    titleRow.appendChild(el('span', { fontSize: '16px' }, '✦'));
        
    const topicTitle = el('div', { fontSize: '17px', fontWeight: '700', color: '#fff', lineHeight: '1.3' }, topicName);
    topicTitle.id = 'eduai-explain-topic';
    titleRow.appendChild(topicTitle);

    hdr.appendChild(titleRow);
    hdr.appendChild(el('div', { fontSize: '9px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }, 'AI Tutor'));
    contentArea.appendChild(hdr);

    // Compact collapsible selection
    const selWrap = el('div', { padding: '4px 14px 8px', fontFamily: FONT_FAMILY, });
    const selHeader = el('div', {
        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
        padding: '6px 0', fontSize: '9px', fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: '1.2px', color: '#444',
    });
    const selArrow = el('span', { fontSize: '8px', color: '#7c5cf7', transition: 'transform 0.2s' }, '▸');
    const selLbl = el('span', {}, 'What you clicked');
    selHeader.appendChild(selArrow); selHeader.appendChild(selLbl);
    const selBody = el('div', {
        display: 'none', padding: '10px 12px', background: '#111125',
        borderRadius: '6px', borderLeft: '2px solid #7c5cf7',
        fontSize: '11px', lineHeight: '1.5', color: '#888', fontStyle: 'italic',
        maxHeight: '100px', overflowY: 'auto',
    });
    const dt = text.length > 300 ? text.substring(0, 300) + '…' : text;
    selBody.textContent = `"${dt}"`;
    selHeader.addEventListener('click', () => {
        const open = selBody.style.display !== 'none';
        selBody.style.display = open ? 'none' : 'block';
        selArrow.textContent = open ? '▸' : '▾';
    });
    selWrap.appendChild(selHeader); selWrap.appendChild(selBody);
    contentArea.appendChild(selWrap);

    // AI Explanation
    const respSec = el('div', { padding: '8px 14px 14px', fontFamily: FONT_FAMILY, });
    respSec.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#444', marginBottom: '10px',
    }, 'Explanation'));

    const respBox = el('div', { fontSize: '12px', lineHeight: '1.7', color: '#ddd' });
    const loader = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '14px', background: '#111125', borderRadius: '8px', border: '1px solid #1a1a34',
    });
    const spinner = el('div', {
        width: '12px', height: '12px',
        border: '2px solid #1a1a34', borderTop: '2px solid #7c5cf7', borderRadius: '50%',
    });
    spinner.className = 'eduai-spinner';
    loader.appendChild(spinner);
    loader.appendChild(el('span', { fontSize: '10px', color: '#555' }, 'Thinking...'));
    respBox.appendChild(loader);
    respSec.appendChild(respBox);
    contentArea.appendChild(respSec);

    try{
        const resp = await fetch('http://localhost:8000/explanations/enrich', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, heading: heading || 'Untitled', context, url: pageMetadata?.full_url || window.location.href}),
        });

        if (resp.body){   
            const data = await resp.json();
            const exSec = el('div', { padding: '8px 14px 14px' });
            renderExamples(exSec, resp ? data.examples : []);
            
            contentArea.appendChild(exSec);

            
            // Related concepts
            const relSec = el('div', { padding: '8px 14px 14px' });
            renderConcepts(relSec, resp ? data.related_concepts : []);

            const legend = el('div', { display: 'flex', gap: '12px', marginTop: '10px', fontSize: '8px', color: '#444' });
            const l1 = el('div', { display: 'flex', alignItems: 'center', gap: '4px' });
            l1.appendChild(el('span', { color: '#00b894', fontSize: '8px' }, '●'));
            l1.appendChild(el('span', {}, 'Studied'));
            const l2 = el('div', { display: 'flex', alignItems: 'center', gap: '4px' });
            l2.appendChild(el('span', { color: '#333', fontSize: '8px' }, '○'));
            l2.appendChild(el('span', {}, 'Not yet explored'));
            legend.appendChild(l1); legend.appendChild(l2);

            relSec.appendChild(legend);
            contentArea.appendChild(relSec);
        }

    }catch(err){
        console.error("Failed to load enrichment", err);
    }
    // Examples section





    // Fire streaming
    if (cached) {
        renderMarkdown(respBox, cached);
    } else {
        streamExplanation(respBox, text, heading, context, metadata);
    }
}


function renderConcepts(container: HTMLElement, concepts: string[]) {
    container.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#444', marginBottom: '10px',
    }, 'Related Concepts'));

    const studied = flattenKnowledge(knowledgeTree);

    const chipRow = el('div', { display: 'flex', flexWrap: 'wrap', gap: '5px', fontFamily: FONT_FAMILY, });
    concepts.forEach(name => {
        const isStudied = studied.has(name.toLowerCase());
        const chip = el('div', {
            padding: '5px 10px', borderRadius: '12px',
            fontSize: '10px', fontWeight: '300',
            background: isStudied ? '#7c5cf715' : '#111125',
            border: '1px solid #7c5cf740' ,
            color: 'white',
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '4px', fontFamily: FONT_FAMILY,
        });
        if (isStudied) chip.appendChild(el('span', { fontSize: '7px', color: '#00b894' }, '●'));
        chip.appendChild(el('span', {}, name));
        chip.addEventListener('mouseenter', () => {
            chip.style.background = isStudied ? '#7c5cf725' : '#1a1a3a';
        });
        chip.addEventListener('mouseleave', () => {
            chip.style.background = isStudied ? '#7c5cf715' : '#111125';
        });
        chipRow.appendChild(chip);
    });

    container.appendChild(chipRow);
}

function renderExamples(container: HTMLElement, examples: any[]) {
    container.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#444', marginBottom: '10px',
    }, 'Examples'));

    examples.forEach((ex, i) => {
        const card = el('div', {
            padding: '12px', background: '#111125', borderRadius: '8px',
            border: '1px solid #1a1a34', marginBottom: '6px',
            transition: 'border-color 0.15s', fontFamily: FONT_FAMILY,
        });
        const cardHdr = el('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' });
        cardHdr.appendChild(el('span', {
            fontSize: '10px', fontWeight: '700', color: '#7c5cf7',
            background: '#7c5cf715', padding: '2px 6px', borderRadius: '6px',
        }, `Example ${i + 1}`));
        cardHdr.appendChild(el('span', {
            fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '6px',
            background: ex.difficulty === 'Easy' ? '#1b5e3b40' : ex.difficulty === 'Medium' ? '#6b5a1a40' : '#5e1b1b40',
            color: ex.difficulty === 'Easy' ? '#4ade80' : ex.difficulty === 'Medium' ? '#fbbf24' : '#f87171',
            textTransform: 'uppercase',
        }, ex.difficulty));
        card.appendChild(cardHdr);
        const qWrap = el('div', {
            fontSize: '11px',
            color: '#ccc',
            lineHeight: '1.5',
            marginBottom: '6px'
        });
        qWrap.style.fontFamily = FONT_FAMILY;
        applyInlineFormatting(qWrap, ex.question);
        card.appendChild(qWrap);

        const showBtn = el('div', { fontSize: '9px', color: '#555', cursor: 'pointer', fontWeight: '600', transition: 'color 0.15s' }, '▸ Show Solution');
        const solWrap = el('div', {
            display: 'none',
            marginTop: '6px',
            padding: '10px',
            background: '#0e0e1e',
            borderRadius: '6px',
            borderLeft: `2px solid ${ex.difficulty === 'Easy' ? '#4ade80' : ex.difficulty === 'Medium' ? '#fbbf24' : '#f87171'}`,
            fontSize: '11px',
            color: '#aaa',
            lineHeight: '1.5',
        });

        solWrap.style.fontFamily = FONT_FAMILY;
        const steps = ex.solution.split(/\\n|\n/).filter((s: string) => s.trim());
        if (steps.length > 1) {
            steps.forEach((step: string, idx: number) => {
                const row = el('div', {
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    marginBottom: idx < steps.length - 1 ? '10px' : '0',
                });
                const dot = el('div', {
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c5cf7, #3b82f6)', border: '1px solid #00b89440',
                    color: '#fff', fontSize: '9px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: '0', marginTop: '1px',
                }, String(idx + 1));
                const stepBody = el('div', { flex: '1', fontSize: '11px', color: '#aaa', lineHeight: '1.6' });
                applyInlineFormatting(stepBody, step.trim());
                row.appendChild(dot);
                row.appendChild(stepBody);
                solWrap.appendChild(row);
            });
        } else {
            applyInlineFormatting(solWrap, ex.solution);
        }
        showBtn.addEventListener('click', () => {
            const open = solWrap.style.display !== 'none';
            solWrap.style.display = open ? 'none' : 'block';
            showBtn.textContent = open ? '▸ Show Solution' : '▾ Hide Solution';
            showBtn.style.color = open ? '#555' : '#7c5cf7';
        });
        card.appendChild(showBtn);
        card.appendChild(solWrap);
        container.appendChild(card);
    });
}

async function streamExplanation(respBox: HTMLElement, text: string, heading: string, context: string, metadata: any) {
    // Find the topic header element in the current view to update it
    const topicEl = document.querySelector('#eduai-explain-topic') as HTMLElement | null;
    respBox.style.fontFamily = FONT_FAMILY;
    try {
        console.log(metadata)
        const resp = await fetch('http://localhost:8000/explain', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, heading: heading || 'Untitled', context, url: pageMetadata?.full_url || window.location.href , subject: metadata?.subject}),
        });
        if (!resp.body) return;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let topicExtracted = false;
        let renderBody = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value);

            if (!topicExtracted) {
                const m = accumulated.match(/^\s*topic:\s*(.+?)\n/i);
                if (m) {
                    if (topicEl) topicEl.textContent = m[1].trim();
                    renderBody = accumulated.substring(m[0].length);
                    topicExtracted = true;
                } else {
                    renderBody = accumulated;
                }
            } else {
                renderBody = accumulated.replace(/^\s*topic:\s*.+?\n/i, '');
            }

            renderMarkdown(respBox, renderBody);
        }
    } catch (err) {
        while (respBox.firstChild) respBox.removeChild(respBox.firstChild);
        respBox.appendChild(el('div', { color: '#e17055', fontSize: '11px' }, `Error: ${(err as Error).message}`));
    }
}