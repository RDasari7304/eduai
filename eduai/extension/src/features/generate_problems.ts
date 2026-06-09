import { applyInlineFormatting } from '../util/ui';
import { el } from '../util/utils';

export async function renderPracticeProblems(area: HTMLElement, topicName: string, data: any) {
    const sec = el('div', { padding: '14px' });

    // ── Difficulty selector ──
    const diffLabel = el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#444', marginBottom: '8px',
    }, 'Difficulty');
    sec.appendChild(diffLabel);

    const diffRow = el('div', {
        display: 'flex', gap: '0', marginBottom: '18px',
        borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a34',
    });

    let selectedDifficulty = 'mixed';
    [
        { id: 'easy', label: 'Easy' },
        { id: 'medium', label: 'Medium' },
        { id: 'hard', label: 'Hard' },
        { id: 'mixed', label: 'Mixed' },
    ].forEach(d => {
        const pill = el('button', {
            flex: '1', padding: '8px 0',
            background: d.id === 'mixed' ? '#7c5cf7' : '#0e0e1e',
            color: d.id === 'mixed' ? '#fff' : '#666', border: 'none',
            fontSize: '10px', fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.5px',
        }, d.label);
        pill.addEventListener('click', () => {
            selectedDifficulty = d.id;
            diffRow.querySelectorAll('button').forEach(b => {
                (b as HTMLElement).style.background = '#0e0e1e';
                (b as HTMLElement).style.color = '#666';
            });
            pill.style.background = '#7c5cf7';
            pill.style.color = '#fff';
        });
        diffRow.appendChild(pill);
    });
    sec.appendChild(diffRow);

    // ── Concept selector ──

    const conceptLabel = el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#444', marginBottom: '8px',
    }, 'Focus Concepts');
    conceptLabel.setAttribute('data-concept-ui', '1');
    sec.appendChild(conceptLabel);
    
    const conceptSubtitle = el('div', {
        fontSize: '10px', color: '#555', marginBottom: '8px', fontStyle: 'italic',
    }, 'Optional — leave empty for general problems');
    conceptSubtitle.setAttribute('data-concept-ui', '1');
    sec.appendChild(conceptSubtitle);

    const selectedConcepts: string[] = [];
    const chipContainer = el('div', { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' });
    chipContainer.setAttribute('data-concept-ui', '1');
    sec.appendChild(chipContainer);

    const conceptDropdownWrap = el('div', { position: 'relative', marginBottom: '20px' });
    conceptDropdownWrap.setAttribute('data-concept-ui', '1');
    const conceptSelect = el('div', {
        padding: '10px 12px', background: '#0e0e1e', border: '1px solid #1a1a34',
        borderRadius: '8px', fontSize: '11px', color: '#666', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'border-color 0.15s',
    });
    const selectLabel = el('span', {}, '+ Add a concept');
    const selectArrow = el('span', { fontSize: '8px', color: '#444' }, '▼');
    conceptSelect.appendChild(selectLabel);
    conceptSelect.appendChild(selectArrow);

    const conceptDropdown = el('div', {
        display: 'none', position: 'absolute', top: '100%', left: '0', right: '0',
        background: '#0e0e1e', border: '1px solid #1a1a34', borderRadius: '8px',
        maxHeight: '160px', overflowY: 'auto', zIndex: '20', marginTop: '4px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    });

    const availableConcepts = (data?.keyConcepts || []).map((c: any) =>
        typeof c === 'string' ? c : (c.term || c.name || '')
    ).filter(Boolean);

    function renderConceptOptions() {
        while (conceptDropdown.firstChild) conceptDropdown.removeChild(conceptDropdown.firstChild);
        const available = availableConcepts.filter((c: string) => !selectedConcepts.includes(c));
        if (available.length === 0) {
            conceptDropdown.appendChild(el('div', {
                padding: '10px 12px', fontSize: '10px', color: '#444', fontStyle: 'italic',
            }, availableConcepts.length === 0 ? 'No concepts available yet' : 'All concepts added'));
            return;
        }
        available.forEach((concept: string) => {
            const option = el('div', {
                padding: '9px 12px', fontSize: '11px', color: '#bbb',
                cursor: 'pointer', transition: 'background 0.1s',
            }, concept);
            option.addEventListener('mouseenter', () => { option.style.background = '#1a1a3a'; });
            option.addEventListener('mouseleave', () => { option.style.background = 'transparent'; });
            option.addEventListener('click', () => {
                selectedConcepts.push(concept);
                conceptDropdown.style.display = 'none';
                conceptSelect.style.borderColor = '#1a1a34';
                selectArrow.textContent = '▼';
                renderSelectedChips();
                renderConceptOptions();
            });
            conceptDropdown.appendChild(option);
        });
    }

    function renderSelectedChips() {
        while (chipContainer.firstChild) chipContainer.removeChild(chipContainer.firstChild);
        selectedConcepts.forEach((concept, i) => {
            const chip = el('div', {
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '4px 8px 4px 10px', background: '#7c5cf715',
                border: '1px solid #7c5cf740', borderRadius: '12px',
                fontSize: '10px', color: '#a78bfa', fontWeight: '600',
            });
            chip.appendChild(el('span', {}, concept));
            const rm = el('span', {
                cursor: 'pointer', fontSize: '9px', color: '#666',
                transition: 'color 0.15s', marginLeft: '2px',
            }, '✕');
            rm.addEventListener('mouseenter', () => { rm.style.color = '#ff6b6b'; });
            rm.addEventListener('mouseleave', () => { rm.style.color = '#666'; });
            rm.addEventListener('click', () => {
                selectedConcepts.splice(i, 1);
                renderSelectedChips();
                renderConceptOptions();
            });
            chip.appendChild(rm);
            chipContainer.appendChild(chip);
        });
    }

    conceptSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = conceptDropdown.style.display !== 'none';
        conceptDropdown.style.display = isOpen ? 'none' : 'block';
        conceptSelect.style.borderColor = isOpen ? '#1a1a34' : '#7c5cf7';
        selectArrow.textContent = isOpen ? '▼' : '▲';
    });
    document.addEventListener('click', (e) => {
        if (!conceptDropdownWrap.contains(e.target as Node)) {
            conceptDropdown.style.display = 'none';
            conceptSelect.style.borderColor = '#1a1a34';
            selectArrow.textContent = '▼';
        }
    });
    renderConceptOptions();
    conceptDropdownWrap.appendChild(conceptSelect);
    conceptDropdownWrap.appendChild(conceptDropdown);
    sec.appendChild(conceptDropdownWrap);

    // ── Generate button + results ──
    const practiceResults = el('div', {});
    const generateBtn = el('button', {
        width: '100%', padding: '12px',
        background: 'linear-gradient(135deg, #7c5cf7, #3b82f6)',
        border: 'none', borderRadius: '8px',
        color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
        transition: 'all 0.15s', letterSpacing: '0.3px',
        boxShadow: '0 4px 12px rgba(124,92,247,0.2)',
    }, '✦  Generate Practice Problems');
    generateBtn.addEventListener('mouseenter', () => {
        generateBtn.style.transform = 'translateY(-1px)';
        generateBtn.style.boxShadow = '0 6px 18px rgba(124,92,247,0.3)';
    });
    generateBtn.addEventListener('mouseleave', () => {
        generateBtn.style.transform = 'translateY(0)';
        generateBtn.style.boxShadow = '0 4px 12px rgba(124,92,247,0.2)';
    });
    generateBtn.addEventListener('click', async () => {
        diffLabel.style.display = 'none';
        diffRow.style.display = 'none';
        sec.querySelectorAll('[data-concept-ui]').forEach(e => (e as HTMLElement).style.display = 'none');
        generateBtn.style.display = 'none';

        const progressHeader = el('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' });
        const progressSpinner = el('div', { width: '12px', height: '12px', border: '2px solid #1a1a34', borderTop: '2px solid #7c5cf7', borderRadius: '50%' });
        progressSpinner.className = 'eduai-spinner';
        progressHeader.appendChild(progressSpinner);
        const progressLabel = el('span', { fontSize: '10px', color: '#666' }, 'Generating problems...');
        progressHeader.appendChild(progressLabel);
        practiceResults.appendChild(progressHeader);

        try {
            const resp = await fetch('http://localhost:8000/practice', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: topicName, difficulty: selectedDifficulty, concepts: selectedConcepts }),
            });
            if (!resp.body) return;

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';
            let renderedCount = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value);

                // Split on delimiter and process complete problems
                const blocks = accumulated.split('===PROBLEM===');
                // Keep last block in buffer (might be incomplete)
                accumulated = blocks.pop() || '';

                for (const block of blocks) {
                    const problem = parseBlock(block.trim());
                    if (problem) {
                        renderedCount++;
                        progressLabel.textContent = `${renderedCount} problem${renderedCount > 1 ? 's' : ''} generated...`;
                        renderProblemCard(practiceResults, problem, renderedCount, topicName, selectedDifficulty, selectedConcepts);
                    }
                }
            }

            // Process any remaining content
            if (accumulated.trim()) {
                const problem = parseBlock(accumulated.trim());
                if (problem) {
                    renderedCount++;
                    renderProblemCard(practiceResults, problem, renderedCount, topicName, selectedDifficulty, selectedConcepts);
                }
            }

            if (progressHeader.parentNode) progressHeader.parentNode.removeChild(progressHeader);

            // Add Generate More button
            const refreshBtn = el('button', {
                width: '100%', padding: '10px', background: 'transparent',
                border: '1px dashed #2a2a4a', borderRadius: '8px',
                color: '#7c5cf7', fontSize: '11px', fontWeight: '700',
                cursor: 'pointer', transition: 'all 0.15s', marginTop: '8px',
            }, '↻  Generate More');
            refreshBtn.addEventListener('mouseenter', () => { refreshBtn.style.background = '#1a1a3a'; refreshBtn.style.borderColor = '#7c5cf7'; refreshBtn.style.borderStyle = 'solid'; });
            refreshBtn.addEventListener('mouseleave', () => { refreshBtn.style.background = 'transparent'; refreshBtn.style.borderColor = '#2a2a4a'; refreshBtn.style.borderStyle = 'dashed'; });
            refreshBtn.addEventListener('click', () => {
                while (practiceResults.firstChild) practiceResults.removeChild(practiceResults.firstChild);
                diffRow.style.display = 'flex';
                diffRow.style.display = '';
                sec.querySelectorAll('[data-concept-ui]').forEach(e => (e as HTMLElement).style.display = '');
                generateBtn.style.display = '';
                generateBtn.style.opacity = '1';
                generateBtn.textContent = '✦  Generate Practice Problems';
            });
            practiceResults.appendChild(refreshBtn);

        } catch (err) {
            console.error('Practice generation failed:', err);
        }
    });

    sec.appendChild(generateBtn);
    sec.appendChild(practiceResults);
    area.appendChild(sec);
}

function parseBlock(block: string): { difficulty: string; question: string; solution: string } | null {
    if (!block || block.length < 20) return null;

    const diffMatch = block.match(/DIFFICULTY:\s*(.+)/i);
    const questMatch = block.match(/QUESTION:\s*([\s\S]+?)(?=\nSOLUTION:)/i);
    const solMatch = block.match(/SOLUTION:\s*([\s\S]+)/i);

    if (!diffMatch || !questMatch || !solMatch) return null;

    return {
        difficulty: diffMatch[1].trim(),
        question: questMatch[1].trim(),
        solution: solMatch[1].trim(),
    };
}

function renderProblemCard(container: HTMLElement, p: any, num: number, topicName?: string, difficulty?: string, concepts?: string[]) {
    const card = el('div', {
        padding: '12px', background: '#0e0e1e', borderRadius: '8px',
        border: '1px solid #1a1a34', marginBottom: '6px',
        transition: 'all 0.3s', opacity: '0', transform: 'translateY(10px)',
    });

    const header = el('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' });
    header.appendChild(el('span', {
        fontSize: '10px', fontWeight: '700', color: '#7c5cf7',
        background: '#7c5cf715', padding: '2px 7px', borderRadius: '6px',
    }, `#${num}`));
    const diff = p.difficulty || 'Medium';
    header.appendChild(el('span', {
        fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px',
        background: diff === 'Easy' ? '#1b5e3b40' : diff === 'Medium' ? '#6b5a1a40' : '#5e1b1b40',
        color: diff === 'Easy' ? '#4ade80' : diff === 'Medium' ? '#fbbf24' : '#f87171',
        textTransform: 'uppercase', letterSpacing: '0.5px',
    }, diff));

    // Spacer pushes refresh to the right
    header.appendChild(el('div', { flex: '1' }));

    // Refresh button
    const refreshIcon = el('div', {
        fontSize: '12px', color: '#444', cursor: 'pointer',
        transition: 'all 0.2s', padding: '2px 4px', borderRadius: '4px',
    }, '↻');
    refreshIcon.addEventListener('mouseenter', () => {
        refreshIcon.style.color = '#7c5cf7';
        refreshIcon.style.background = '#7c5cf715';
    });
    refreshIcon.addEventListener('mouseleave', () => {
        refreshIcon.style.color = '#444';
        refreshIcon.style.background = 'transparent';
    });
    refreshIcon.addEventListener('click', async (e) => {
    e.stopPropagation();

    // Replace card content with spinner
    const originalHeight = card.offsetHeight;
    while (card.firstChild) card.removeChild(card.firstChild);
    card.style.minHeight = `${originalHeight}px`;
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'center';
    card.style.gap = '8px';

    const spin = el('div', {
        width: '14px', height: '14px',
        border: '2px solid #1a1a34', borderTop: '2px solid #7c5cf7',
        borderRadius: '50%',
    });
    spin.className = 'eduai-spinner';
    card.appendChild(spin);
    card.appendChild(el('span', { fontSize: '10px', color: '#555' }, 'Regenerating...'));

    try {
        const resp = await fetch('http://localhost:8000/practice/single', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: topicName || '',
                difficulty: diff.toLowerCase(),
                concepts: concepts || [],
            }),
        });
        const raw = await resp.text();
        const newProblem = parseBlock(raw.trim());
        if (newProblem && card.parentNode) {
            const parent = card.parentNode as HTMLElement;
            const nextSibling = card.nextSibling;
            parent.removeChild(card);
            const placeholder = document.createElement('div');
            if (nextSibling) parent.insertBefore(placeholder, nextSibling);
            else parent.appendChild(placeholder);
            renderProblemCard(parent, newProblem, num, topicName, difficulty, concepts);
            // Move the newly appended card to placeholder position
            const newCard = parent.lastElementChild as HTMLElement;
            if (newCard && placeholder.parentNode) {
                parent.insertBefore(newCard, placeholder);
                parent.removeChild(placeholder);
            }
        }
    } catch (err) {
        // Restore error state
        while (card.firstChild) card.removeChild(card.firstChild);
        card.style.minHeight = '';
        card.style.display = '';
        card.style.alignItems = '';
        card.style.justifyContent = '';
        card.appendChild(el('div', { color: '#e17055', fontSize: '10px', padding: '10px', textAlign: 'center' }, 'Failed to regenerate. Try again.'));
    }
});
    header.appendChild(refreshIcon);
    card.appendChild(header);

    // Question
    const qDiv = el('div', { fontSize: '12px', color: '#ddd', lineHeight: '1.5', marginBottom: '8px' });
    applyInlineFormatting(qDiv, p.question || '');
    card.appendChild(qDiv);

    // Solution
    const answerWrap = el('div', {
        display: 'none', padding: '12px', background: '#080816',
        borderRadius: '6px', borderLeft: '2px solid #00b894', marginTop: '6px',
    });
    const steps = (p.solution || '').split(/\n/).filter((s: string) => s.trim());
    steps.forEach((step: string, idx: number) => {
        const row = el('div', { display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' });
        row.appendChild(el('div', {
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#00b89420', border: '1px solid #00b89440',
            color: '#00b894', fontSize: '9px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
        }, String(idx + 1)));
        const stepBody = el('div', { flex: '1', fontSize: '11px', color: '#aaa', lineHeight: '1.6' });
        applyInlineFormatting(stepBody, step.trim());
        row.appendChild(stepBody);
        answerWrap.appendChild(row);
    });
    card.appendChild(answerWrap);

    const showBtn = el('div', { fontSize: '9px', color: '#555', cursor: 'pointer', fontWeight: '600' }, '▸ Show Solution');
    showBtn.addEventListener('click', () => {
        const v = answerWrap.style.display !== 'none';
        answerWrap.style.display = v ? 'none' : 'block';
        showBtn.textContent = v ? '▸ Show Solution' : '▾ Hide Solution';
        showBtn.style.color = v ? '#555' : '#7c5cf7';
    });
    card.appendChild(showBtn);

    container.appendChild(card);
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
}