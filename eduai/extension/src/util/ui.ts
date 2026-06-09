import { currentState } from './state';
import { el } from './utils';
 
export function createSidebar(): HTMLDivElement {
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
 
export function renderHeader(container: HTMLElement) {
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
 
export function renderBottomBar(container: HTMLElement, onAnalyze: () => void, onKnowledgeMap: () => void) {
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
    mBtn.addEventListener('click', onKnowledgeMap);
    bar.appendChild(aBtn); bar.appendChild(mBtn);
    container.appendChild(bar);
}
 
export function showLoader(area: HTMLElement): HTMLElement {
    const w = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '10px' });
    const s = el('div', { width: '20px', height: '20px', border: '2px solid #1a1a34', borderTop: '2px solid #7c5cf7', borderRadius: '50%' });
    s.className = 'eduai-spinner';
    w.appendChild(s); w.appendChild(el('span', { fontSize: '10px', color: '#333' }, 'Analyzing…'));
    area.appendChild(w);
    return w;
}
 
export function collapsibleSection(labelText: string, defaultOpen: boolean = false): { wrapper: HTMLElement, content: HTMLElement } {
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
 
export function lbl(text: string): HTMLElement {
    return el('div', { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#444', marginBottom: '8px' }, text);
}


export function flattenKnowledge(tree: any): Set<string> {
    const names = new Set<string>();
    function walk(node: any) {
        if (node.name) names.add(node.name.toLowerCase());
        (node.children || []).forEach(walk);
    }
    if (tree) Object.values(tree).forEach(walk);
    return names;
}

const SECTION_STYLES: Record<string, { bg: string; border: string; accent: string; icon: string; label: string }> = {
    'definition':      { bg: '#1a1a3a', border: '#7c5cf7', accent: '#a78bfa', icon: '📖', label: 'DEFINITION' },
    'why it matters':  { bg: '#1a2a3a', border: '#3b82f6', accent: '#60a5fa', icon: '💡', label: 'WHY IT MATTERS' },
    'how it works':    { bg: '#1a2a2a', border: '#06b6d4', accent: '#22d3ee', icon: '⚙', label: 'HOW IT WORKS' },
    'example':         { bg: '#1a3a2a', border: '#10b981', accent: '#4ade80', icon: '✨', label: 'EXAMPLE' },
    'key insight':     { bg: '#3a2a1a', border: '#f59e0b', accent: '#fbbf24', icon: '⚡', label: 'KEY INSIGHT' },
    'approach':        { bg: '#2a1a3a', border: '#a855f7', accent: '#c084fc', icon: '🎯', label: 'APPROACH' },
    'final answer':    { bg: '#1a3a2a', border: '#10b981', accent: '#4ade80', icon: '✓', label: 'FINAL ANSWER' },
};

export function renderMarkdown(area: HTMLElement, raw: string) {
    raw = raw.replace(/\*\*(Definition:|Why it matters:|How it works:|Example:|Key insight:|Approach:|Final answer:|Step \d+:)\*\*/gi, '$1');
    while (area.firstChild) area.removeChild(area.firstChild);

    const sectionRegex = /(Definition:|Why it matters:|How it works:|Example:|Key insight:|Approach:|Final answer:|Step \d+:)/gi;
    const parts = raw.split(sectionRegex).filter(p => p && p.trim());

    let i = 0;
    while (i < parts.length) {
        const part = parts[i].trim();
        const lower = part.toLowerCase();

        // Step blocks
        const stepMatch = part.match(/^step (\d+):$/i);
        if (stepMatch && i + 1 < parts.length) {
            const stepNum = stepMatch[1];
            const content = parts[i + 1].trim();
            const stepRow = el('div', {
                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px',
                padding: '12px', background: '#0e0e1e',
                borderRadius: '8px', borderLeft: '3px solid #7c5cf7',
            });
            stepRow.appendChild(el('div', {
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c5cf7, #3b82f6)',
                color: '#fff', fontSize: '11px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: '0', lineHeight: '1',
            }, stepNum));
            const stepBody = el('div', { flex: '1', fontSize: '12px', lineHeight: '1.6', color: '#ddd' });
            applyInlineFormatting(stepBody, content);
            stepRow.appendChild(stepBody);
            area.appendChild(stepRow);
            i += 2;
            continue;
        }

        // Labeled sections
        const labelKey = lower.replace(':', '').trim();
        if (SECTION_STYLES[labelKey] && i + 1 < parts.length) {
            const style = SECTION_STYLES[labelKey];
            const content = parts[i + 1].trim();
            const section = el('div', {
                padding: '12px 14px', background: style.bg,
                borderRadius: '8px', borderLeft: `3px solid ${style.border}`,
                marginBottom: '10px',
            });
            const header = el('div', {
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px',
            });
            header.appendChild(el('span', { fontSize: '12px' }, style.icon));
            header.appendChild(el('span', {
                fontSize: '9px', fontWeight: '700', color: style.accent, letterSpacing: '1px',
            }, style.label));
            section.appendChild(header);
            const body = el('div', { fontSize: '12px', lineHeight: '1.6', color: '#ddd' });
            applyInlineFormatting(body, content);
            section.appendChild(body);
            area.appendChild(section);
            i += 2;
            continue;
        }

        // Fallback for unstructured text
        if (part.length > 5) {
            const paragraphs = part.split(/\n\s*\n/);
            paragraphs.forEach(p => {
                const trimmed = p.trim();
                if (!trimmed) return;
                const para = el('p', {
                    fontSize: '12px', lineHeight: '1.7', color: '#ccc',
                    margin: '0 0 10px 0',
                });
                applyInlineFormatting(para, trimmed);
                area.appendChild(para);
            });
        }
        i += 1;
    }
}

// ─── Balanced brace matching ─────────────────────────────────
function extractBraceGroup(s: string, start: number): { content: string; end: number } | null {
    if (s[start] !== '{') return null;
    let depth = 1, i = start + 1;
    while (i < s.length && depth > 0) {
        if (s[i] === '\\' && i + 1 < s.length) { i += 2; continue; }
        if (s[i] === '{') depth++;
        else if (s[i] === '}') depth--;
        i++;
    }
    return depth === 0 ? { content: s.substring(start + 1, i - 1), end: i - 1 } : null;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── LaTeX → HTML math renderer ──────────────────────────────
const MATH_SYMBOLS: Record<string, string> = {
    // Greek
    omega: 'ω', Omega: 'Ω', alpha: 'α', beta: 'β', gamma: 'γ', Gamma: 'Γ',
    delta: 'δ', Delta: 'Δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
    theta: 'θ', Theta: 'Θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', Lambda: 'Λ', mu: 'μ', nu: 'ν', xi: 'ξ', Xi: 'Ξ',
    pi: 'π', Pi: 'Π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ',
    sigma: 'σ', Sigma: 'Σ', tau: 'τ', upsilon: 'υ', Upsilon: 'Υ',
    phi: 'φ', Phi: 'Φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', Psi: 'Ψ',
    // Operators
    int: '∫', iint: '∬', iiint: '∭', oint: '∮', sum: '∑', prod: '∏', coprod: '∐',
    infty: '∞', partial: '∂', nabla: '∇', cdot: '·', cdots: '⋯', ldots: '…', dots: '…',
    times: '×', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆', circ: '∘', bullet: '•',
    // Relations
    leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
    approx: '≈', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝',
    subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇',
    in: '∈', notin: '∉', ni: '∋', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅',
    forall: '∀', exists: '∃', nexists: '∄', neg: '¬', land: '∧', lor: '∨',
    // Arrows
    to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔',
    Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔',
    longrightarrow: '⟶', longleftarrow: '⟵', mapsto: '↦',
    uparrow: '↑', downarrow: '↓',
    // Functions (kept as text)
    sin: 'sin', cos: 'cos', tan: 'tan', sec: 'sec', csc: 'csc', cot: 'cot',
    arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
    log: 'log', ln: 'ln', lg: 'lg', exp: 'exp',
    lim: 'lim', limsup: 'lim sup', liminf: 'lim inf',
    min: 'min', max: 'max', sup: 'sup', inf: 'inf',
    arg: 'arg', det: 'det', dim: 'dim', ker: 'ker', mod: 'mod', gcd: 'gcd',
    // Misc
    angle: '∠', perp: '⊥', parallel: '∥', degree: '°',
    prime: '′', aleph: 'ℵ', hbar: 'ℏ', ell: 'ℓ', Re: 'ℜ', Im: 'ℑ',
    quad: '\u2003', qquad: '\u2003\u2003',
};

const MATHBB_MAP: Record<string, string> = {
    R: 'ℝ', Z: 'ℤ', N: 'ℕ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', E: '𝔼', H: 'ℍ', F: '𝔽',
};

export function renderMath(latex: string): string {
    let result = '';
    let i = 0;
    const n = latex.length;

    while (i < n) {
        const c = latex[i];

        if (c === '\\') {
            // Command or escaped char
            const cmdMatch = latex.substring(i).match(/^\\([a-zA-Z]+)/);
            if (cmdMatch) {
                const cmd = cmdMatch[1];
                const afterCmd = i + 1 + cmd.length;

                // Commands taking arguments
                if (cmd === 'frac' || cmd === 'tfrac' || cmd === 'dfrac') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        const b = extractBraceGroup(latex, a.end + 1);
                        if (b) {
                            result += `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.9em;margin:0 3px;line-height:1.1"><span style="border-bottom:1px solid currentColor;padding:0 5px 1px">${renderMath(a.content)}</span><span style="padding:1px 5px 0">${renderMath(b.content)}</span></span>`;
                            i = b.end + 1;
                            continue;
                        }
                    }
                } else if (cmd === 'sqrt') {
                    let nth = '', pos = afterCmd;
                    if (latex[pos] === '[') {
                        const close = latex.indexOf(']', pos);
                        if (close !== -1) { nth = latex.substring(pos + 1, close); pos = close + 1; }
                    }
                    const a = extractBraceGroup(latex, pos);
                    if (a) {
                        const prefix = nth ? `<sup style="font-size:0.7em;vertical-align:0.5em">${renderMath(nth)}</sup>` : '';
                        result += `${prefix}<span style="font-size:1.1em">√</span><span style="border-top:1px solid currentColor;padding:1px 3px 0">${renderMath(a.content)}</span>`;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'boxed') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        result += `<span style="border:1px solid currentColor;padding:3px 10px;border-radius:4px;display:inline-block">${renderMath(a.content)}</span>`;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'overline' || cmd === 'bar') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        result += `<span style="border-top:1px solid currentColor;padding-top:1px">${renderMath(a.content)}</span>`;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'underline') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        result += `<span style="border-bottom:1px solid currentColor">${renderMath(a.content)}</span>`;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'hat') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        result += `<span style="position:relative;display:inline-block">${renderMath(a.content)}<span style="position:absolute;top:-0.6em;left:0;right:0;text-align:center;font-size:0.8em">^</span></span>`;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'vec') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        result += `<span style="position:relative;display:inline-block">${renderMath(a.content)}<span style="position:absolute;top:-0.7em;left:0;right:0;text-align:center;font-size:0.8em">→</span></span>`;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'binom') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        const b = extractBraceGroup(latex, a.end + 1);
                        if (b) {
                            result += `<span style="font-size:1.4em">(</span><span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.9em;margin:0 2px;line-height:1.1"><span>${renderMath(a.content)}</span><span>${renderMath(b.content)}</span></span><span style="font-size:1.4em">)</span>`;
                            i = b.end + 1;
                            continue;
                        }
                    }
                } else if (cmd === 'text' || cmd === 'textrm' || cmd === 'mathrm' || cmd === 'textbf' || cmd === 'mathbf' || cmd === 'textit' || cmd === 'mathit') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        const isBold = cmd === 'textbf' || cmd === 'mathbf';
                        const isItalic = cmd === 'textit' || cmd === 'mathit';
                        const style = `font-family:inherit;font-style:${isItalic ? 'italic' : 'normal'};${isBold ? 'font-weight:700;' : ''}`;
                        result += `<span style="${style}">${escapeHtml(a.content)}</span>`;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'mathbb') {
                    const a = extractBraceGroup(latex, afterCmd);
                    if (a) {
                        result += MATHBB_MAP[a.content.trim()] || a.content;
                        i = a.end + 1;
                        continue;
                    }
                } else if (cmd === 'left' || cmd === 'right') {
                    // Skip \left and \right modifiers — the bracket itself follows
                    i = afterCmd;
                    if (latex[i] === '.') { i++; continue; } // \left. / \right. = invisible
                    continue;
                }

                // Simple symbol replacement
                if (MATH_SYMBOLS[cmd] !== undefined) {
                    result += MATH_SYMBOLS[cmd];
                    i = afterCmd;
                    if (latex[i] === ' ') i++; // consume one separating space
                    continue;
                }

                // Unknown command — skip it
                i = afterCmd;
                continue;
            }

            // Backslash-escaped characters
            const next = latex[i + 1];
            if (next === '\\') { result += '<br>'; i += 2; continue; }
            if (next === ',' || next === ';' || next === '!' || next === ' ' || next === ':') { i += 2; continue; }
            if (next === '{' || next === '}' || next === '#' || next === '%' || next === '_' || next === '^' || next === '$') {
                result += escapeHtml(next); i += 2; continue;
            }
            if (next === '&') { result += '&amp;'; i += 2; continue; }
            i++;
            continue;
        }

        if (c === '^' || c === '_') {
            const isSup = c === '^';
            i++;
            let content = '';
            if (latex[i] === '{') {
                const a = extractBraceGroup(latex, i);
                if (a) { content = renderMath(a.content); i = a.end + 1; }
            } else if (latex[i] === '\\') {
                const m = latex.substring(i).match(/^\\[a-zA-Z]+/);
                if (m) { content = renderMath(m[0]); i += m[0].length; }
                else { content = escapeHtml(latex[i + 1] || ''); i += 2; }
            } else {
                content = escapeHtml(latex[i] || '');
                i++;
            }
            result += isSup ? `<sup>${content}</sup>` : `<sub>${content}</sub>`;
            continue;
        }

        if (c === '{') {
            const a = extractBraceGroup(latex, i);
            if (a) { result += renderMath(a.content); i = a.end + 1; continue; }
        }

        if (c === '<') { result += '&lt;'; i++; continue; }
        if (c === '>') { result += '&gt;'; i++; continue; }
        if (c === '&') { result += '&amp;'; i++; continue; }

        result += c;
        i++;
    }

    return result;
}

// ─── Inline formatting (markdown + math) ─────────────────────
export function applyInlineFormatting(target: HTMLElement, text: string) {
    let pos = 0;
    const len = text.length;
    let buffer = '';

    const flush = () => {
        if (buffer.length > 0) {
            target.appendChild(document.createTextNode(buffer));
            buffer = '';
        }
    };

    const mathWrap = (expr: string, isDisplay: boolean) => {
        flush();
        const wrap = el(isDisplay ? 'div' : 'span', isDisplay ? {
            padding: '12px 0', textAlign: 'center', overflowX: 'auto',
            fontFamily: '"Cambria Math", "Latin Modern Math", "STIX Two Math", serif',
            fontSize: '15px', color: '#fff', lineHeight: '1.5',
        } : {
            fontFamily: '"Cambria Math", "Latin Modern Math", "STIX Two Math", serif',
            color: '#fff',
        });
        wrap.innerHTML = renderMath(expr.trim());
        target.appendChild(wrap);
    };

    while (pos < len) {
        // Display math: \[...\]
        if (text[pos] === '\\' && text[pos + 1] === '[') {
            const end = text.indexOf('\\]', pos + 2);
            if (end !== -1) {
                mathWrap(text.substring(pos + 2, end), true);
                pos = end + 2;
                continue;
            }
        }

        // Inline math: \(...\)
        if (text[pos] === '\\' && text[pos + 1] === '(') {
            const end = text.indexOf('\\)', pos + 2);
            if (end !== -1) {
                mathWrap(text.substring(pos + 2, end), false);
                pos = end + 2;
                continue;
            }
        }

        // Display math: $$...$$
        if (text[pos] === '$' && text[pos + 1] === '$') {
            const end = text.indexOf('$$', pos + 2);
            if (end !== -1) {
                mathWrap(text.substring(pos + 2, end), true);
                pos = end + 2;
                continue;
            }
        }

        // Inline math: $...$  (avoid currency: must not have digit/word adjacent)
        if (text[pos] === '$' && pos + 1 < len && text[pos + 1] !== '$') {
            const prev = pos > 0 ? text[pos - 1] : ' ';
            if (!/\w/.test(prev)) {
                const end = text.indexOf('$', pos + 1);
                if (end !== -1 && end > pos + 1 && !text.substring(pos + 1, end).includes('\n')) {
                    const next = end + 1 < len ? text[end + 1] : ' ';
                    if (!/\w/.test(next)) {
                        mathWrap(text.substring(pos + 1, end), false);
                        pos = end + 1;
                        continue;
                    }
                }
            }
        }

        // Bold: **...**
        if (text[pos] === '*' && text[pos + 1] === '*') {
            const end = text.indexOf('**', pos + 2);
            if (end !== -1 && end > pos + 2) {
                flush();
                const content = text.substring(pos + 2, end);
                target.appendChild(el('strong', { fontWeight: '700', color: '#fff' }, content));
                pos = end + 2;
                continue;
            }
        }

        // Italic: *...*  (not part of **)
        if (text[pos] === '*' && text[pos + 1] !== '*' && pos + 1 < len && !/\s/.test(text[pos + 1])) {
            const end = text.indexOf('*', pos + 1);
            if (end !== -1 && end > pos + 1 && text[end + 1] !== '*') {
                flush();
                const content = text.substring(pos + 1, end);
                target.appendChild(el('em', { fontStyle: 'italic', color: '#a29bfe' }, content));
                pos = end + 1;
                continue;
            }
        }

        // Code: `...`
        if (text[pos] === '`') {
            const end = text.indexOf('`', pos + 1);
            if (end !== -1 && end > pos + 1) {
                flush();
                const content = text.substring(pos + 1, end);
                target.appendChild(el('code', {
                    fontFamily: 'monospace', fontSize: '11px',
                    background: '#1a1a3a', padding: '1px 5px', borderRadius: '3px', color: '#7c5cf7',
                }, content));
                pos = end + 1;
                continue;
            }
        }

        // Regular character
        buffer += text[pos];
        pos++;
    }
    flush();
}
