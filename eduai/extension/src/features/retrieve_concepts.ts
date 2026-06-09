import { el, parseSources } from '../util/utils';

// ── Helpers ──



function statusToColor(status: string): { bg: string; border: string; text: string; label: string } {
    switch (status) {
        case 'strong':      return { bg: '#1b5e3b40', border: '#4ade80', text: '#4ade80', label: 'STRONG' };
        case 'learning':    return { bg: '#6b5a1a40', border: '#fbbf24', text: '#fbbf24', label: 'LEARNING' };
        case 'new':         return { bg: '#5e1b1b40', border: '#f87171', text: '#f87171', label: 'NEW' };
        default:            return { bg: '#1a1a34', border: '#444', text: '#666', label: 'NOT STARTED' };
    }
}

function formatLastSeen(ts: string | number | null): string {
    if (!ts) return 'Never';
    const time = typeof ts === 'string' ? new Date(ts + 'Z').getTime() : ts;
    if (isNaN(time)) return 'Never';
    const diff = Date.now() - time;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 7) return `${Math.floor(days / 7)}w ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
}

function compute_mastery(
    times_encountered: number, quiz_correct: number,
    quiz_incorrect: number, total_time_spent: number,
    confidence_sum: number, last_seen: string
): { score: number; status: string } {
    if (times_encountered === 0) return { score: 0, status: 'not_started' };
    const total_attempts = quiz_correct + quiz_incorrect;

    const quiz_component = total_attempts === 0 ? 0
        : (quiz_correct / total_attempts) * Math.min(total_attempts / 5, 1) * 35;
    const encounter_depth = Math.min(times_encountered / 8, 1) * 20;
    const days_since = (Date.now() - new Date(last_seen).getTime()) / 86400000;
    const recency = Math.max(0, 1 - (days_since / 30)) * 25;
    const confidence = total_attempts === 0 ? 0 : ((confidence_sum / total_attempts) - 1) * 2.5;
    const time_invested = Math.min(total_time_spent / 600, 1) * 10;
    const score = quiz_component + encounter_depth + recency + confidence + time_invested;

    let status = 'strong';
    if (score < 29) status = 'new';
    else if (score < 64) status = 'learning';

    return { score, status };
}

// ── Main render ──

export async function renderConcepts(area: HTMLElement, data: any, topicName: string) {
    const wrap = el('div', { padding: '14px' });
    area.appendChild(wrap);

    // Loading state
    const loader = el('div', {
        textAlign: 'center', padding: '30px', fontSize: '11px', color: '#555',
    }, 'Loading concepts…');
    wrap.appendChild(loader);

    // Fetch from API
    let raw: any[];
    try {
        const res = await fetch(
            `http://localhost:8000/knowledge/concepts?topic=${encodeURIComponent(topicName)}`
        );
        if (!res.ok) throw new Error('Failed to fetch');
        raw = await res.json();
    } catch {
        wrap.removeChild(loader);
        wrap.appendChild(el('div', {
            padding: '40px 20px', textAlign: 'center', color: '#444',
            border: '1px dashed #1a1a34', borderRadius: '10px',
        }, 'Could not load concepts.'));
        return;
    }

    wrap.removeChild(loader);

    // Fallback: if API returned nothing, try keyConcepts from page analysis
    if (raw.length === 0) {
        const keyConcepts = (data?.key_concepts || data?.keyConcepts || []) as any[];
        raw = keyConcepts.map(c => ({
            name: typeof c === 'string' ? c : (c.term || c.name || ''),
            mastery_score: 0,
            times_encountered: 0,
            quiz_correct: 0,
            quiz_incorrect: 0,
            total_time_spent: 0,
            confidence_sum: 0,
            last_seen: null,
            first_seen: null,
            sources: '[]',
            subtopic_count: 0,
            id: null,
            parentid: null,
        })).filter(c => c.name);
    }

    if (raw.length === 0) {
        const empty = el('div', {
            padding: '40px 20px', textAlign: 'center', color: '#444',
            border: '1px dashed #1a1a34', borderRadius: '10px',
        });
        empty.appendChild(el('div', { fontSize: '28px', marginBottom: '10px', color: '#7c5cf7' }, '💡'));
        empty.appendChild(el('div', { fontSize: '11px', color: '#666', lineHeight: '1.5' },
            'No concepts tracked yet. Keep reading pages on this topic and concepts will appear here with mastery tracking.'));
        wrap.appendChild(empty);
        return;
    }

    // Derive mastery for each concept
    const enriched = raw.map(c => {
        const mastery = compute_mastery(
            c.times_encountered ?? 0,
            c.quiz_correct ?? 0,
            c.quiz_incorrect ?? 0,
            c.total_time_spent ?? 0,
            c.confidence_sum ?? 0,
            c.last_seen ?? ''
        );
        return {
            id: c.id,
            name: c.name,
            mastery: mastery.score / 100,       // 0–1 for bar widths
            score: mastery.score,                // 0–100 raw
            status: mastery.status,
            encounters: c.times_encountered ?? 0,
            lastSeen: c.last_seen ?? null,
            subtopicCount: c.subtopic_count ?? 0,
            sources: parseSources(c.sources),
        };
    });

    // ── Summary bar ──
    const stats = {
        strong: enriched.filter(c => c.status === 'strong').length,
        learning: enriched.filter(c => c.status === 'learning').length,
        new: enriched.filter(c => c.status === 'new').length,
        not_started: enriched.filter(c => c.status === 'not_started').length,
    };
    const total = enriched.length;
    const avgScore = total > 0
        ? Math.round(enriched.reduce((sum, c) => sum + c.score, 0) / total)
        : 0;

    const summary = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    const sumTop = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' });
    sumTop.appendChild(el('div', { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#666' }, 'Mastery Overview'));
    sumTop.appendChild(el('div', { fontSize: '20px', fontWeight: '700', color: '#fff' }, `${avgScore}%`));
    summary.appendChild(sumTop);

    const bar = el('div', { height: '6px', background: '#0a0a18', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginBottom: '10px' });
    if (stats.strong > 0)      bar.appendChild(el('div', { height: '100%', background: '#4ade80', flex: `${stats.strong}` }));
    if (stats.learning > 0)    bar.appendChild(el('div', { height: '100%', background: '#fbbf24', flex: `${stats.learning}` }));
    if (stats.new > 0)         bar.appendChild(el('div', { height: '100%', background: '#f87171', flex: `${stats.new}` }));
    if (stats.not_started > 0) bar.appendChild(el('div', { height: '100%', background: '#2a2a4a', flex: `${stats.not_started}` }));
    summary.appendChild(bar);

    const legend = el('div', { display: 'flex', gap: '12px', fontSize: '9px', color: '#888', flexWrap: 'wrap' });
    [
        { c: '#4ade80', n: stats.strong, l: 'Strong' },
        { c: '#fbbf24', n: stats.learning, l: 'Learning' },
        { c: '#f87171', n: stats.new, l: 'New' },
        { c: '#2a2a4a', n: stats.not_started, l: 'Not started' },
    ].forEach(s => {
        const item = el('div', { display: 'flex', alignItems: 'center', gap: '4px' });
        item.appendChild(el('span', { width: '7px', height: '7px', borderRadius: '50%', background: s.c, display: 'inline-block' }));
        item.appendChild(el('span', {}, `${s.n} ${s.l}`));
        legend.appendChild(item);
    });
    summary.appendChild(legend);
    wrap.appendChild(summary);

    // ── Filter pills ──
    let activeFilter: string = 'all';
    const filterRow = el('div', { display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' });
    const filters = [
        { id: 'all',         label: 'All',         count: total },
        { id: 'strong',      label: 'Strong',      count: stats.strong },
        { id: 'learning',    label: 'Learning',    count: stats.learning },
        { id: 'new',         label: 'New',         count: stats.new },
        { id: 'not_started', label: 'Not started', count: stats.not_started },
    ];
    const pills: HTMLElement[] = [];
    filters.forEach(f => {
        const pill = el('div', {
            padding: '5px 10px', borderRadius: '12px',
            background: f.id === 'all' ? '#7c5cf7' : '#111125',
            border: f.id === 'all' ? '1px solid #7c5cf7' : '1px solid #1a1a34',
            color: f.id === 'all' ? '#fff' : '#666',
            fontSize: '10px', fontWeight: '600', cursor: 'pointer',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px',
        });
        pill.appendChild(el('span', {}, f.label));
        pill.appendChild(el('span', { fontSize: '9px', fontWeight: '700', opacity: '0.6' }, String(f.count)));
        pill.addEventListener('click', () => {
            activeFilter = f.id;
            pills.forEach(p => { p.style.background = '#111125'; p.style.borderColor = '#1a1a34'; p.style.color = '#666'; });
            pill.style.background = '#7c5cf7'; pill.style.borderColor = '#7c5cf7'; pill.style.color = '#fff';
            renderList();
        });
        pills.push(pill);
        filterRow.appendChild(pill);
    });
    wrap.appendChild(filterRow);

    // ── Concept list ──
    const listContainer = el('div', {});
    wrap.appendChild(listContainer);

    function renderList() {
        while (listContainer.firstChild) listContainer.removeChild(listContainer.firstChild);

        const filtered = enriched.filter(c => {
            if (activeFilter === 'all') return true;
            return c.status === activeFilter;
        }).sort((a, b) => a.score - b.score);

        if (filtered.length === 0) {
            listContainer.appendChild(el('div', {
                padding: '24px', textAlign: 'center', color: '#444', fontSize: '10px',
                border: '1px dashed #1a1a34', borderRadius: '8px',
            }, 'No concepts in this category'));
            return;
        }

        filtered.forEach(c => {
            const color = statusToColor(c.status);
            const card = el('div', {
                background: '#111125', borderRadius: '10px',
                border: '1px solid #1a1a34', marginBottom: '6px',
                transition: 'border-color 0.15s', overflow: 'hidden',
            });

            const header = el('div', { padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' });

            const topRow = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' });
            const nameWrap = el('div', { display: 'flex', alignItems: 'center', gap: '8px', flex: '1', overflow: 'hidden' });
            nameWrap.appendChild(el('span', { width: '8px', height: '8px', borderRadius: '50%', background: color.border, flexShrink: '0' }));
            nameWrap.appendChild(el('div', { fontSize: '12px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, c.name));
            topRow.appendChild(nameWrap);
            topRow.appendChild(el('div', {
                fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px',
                background: color.bg, color: color.text, letterSpacing: '0.5px', flexShrink: '0',
            }, color.label));
            header.appendChild(topRow);

            const masteryBar = el('div', { height: '4px', background: '#0a0a18', borderRadius: '2px', overflow: 'hidden' });
            masteryBar.appendChild(el('div', { height: '100%', width: `${c.mastery * 100}%`, background: color.border, transition: 'width 0.3s' }));
            header.appendChild(masteryBar);

            const meta = el('div', { display: 'flex', gap: '10px', fontSize: '9px', color: '#555' });
            meta.appendChild(el('span', {}, `${c.encounters} encounter${c.encounters !== 1 ? 's' : ''}`));
            meta.appendChild(el('span', {}, '·'));
            meta.appendChild(el('span', {}, formatLastSeen(c.lastSeen)));
            if (c.subtopicCount > 0) {
                meta.appendChild(el('span', {}, '·'));
                meta.appendChild(el('span', { color: '#7c5cf7' }, `${c.subtopicCount} subtopic${c.subtopicCount !== 1 ? 's' : ''}`));
            }
            header.appendChild(meta);
            card.appendChild(header);

            // Expandable details
            const details = el('div', { display: 'none', padding: '0 14px 14px', borderTop: '1px solid #1a1a34', background: '#0e0e1e' });

            if (c.sources.length > 0) {
                details.appendChild(el('div', {
                    fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
                    letterSpacing: '1px', color: '#444', margin: '12px 0 6px',
                }, `Explored on ${c.sources.length} page${c.sources.length !== 1 ? 's' : ''}`));

                const sourceList = el('div', { display: 'flex', flexDirection: 'column', gap: '4px' });
                c.sources.forEach((url: string) => {
                    let hostname = '';
                    let path = url;
                    try {
                        const u = new URL(url);
                        hostname = u.hostname.replace(/^www\./, '');
                        path = u.pathname;
                    } catch {
                        hostname = url;
                    }

                    const link = el('a', {
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 10px', background: '#111125',
                        borderRadius: '6px', border: '1px solid #1a1a34',
                        textDecoration: 'none', cursor: 'pointer',
                        transition: 'all 0.15s',
                    });
                    link.setAttribute('href', url);
                    link.setAttribute('target', '_blank');
                    link.addEventListener('click', (e) => e.stopPropagation());
                    link.addEventListener('mouseenter', () => { link.style.borderColor = '#7c5cf740'; link.style.background = '#1a1a3a'; });
                    link.addEventListener('mouseleave', () => { link.style.borderColor = '#1a1a34'; link.style.background = '#111125'; });

                    link.appendChild(el('span', { fontSize: '10px', flexShrink: '0' }, '🔗'));
                    const textWrap = el('div', { flex: '1', overflow: 'hidden' });
                    textWrap.appendChild(el('div', {
                        fontSize: '10px', fontWeight: '600', color: '#a78bfa',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }, hostname));
                    if (path && path !== '/') {
                        textWrap.appendChild(el('div', {
                            fontSize: '8px', color: '#555',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }, path));
                    }
                    link.appendChild(textWrap);
                    link.appendChild(el('span', { fontSize: '8px', color: '#444', flexShrink: '0' }, '↗'));
                    sourceList.appendChild(link);
                });
                details.appendChild(sourceList);
            }

            // Subtopics drill-down button
            if (c.subtopicCount > 0) {
                details.appendChild(el('div', {
                    fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
                    letterSpacing: '1px', color: '#444', margin: '12px 0 6px',
                }, 'Subtopics'));
                const drillBtn = el('div', {
                    padding: '8px 12px', background: '#7c5cf715', border: '1px solid #7c5cf730',
                    borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: '#7c5cf7',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                }, `View ${c.subtopicCount} subtopic${c.subtopicCount !== 1 ? 's' : ''} →`);
                drillBtn.addEventListener('mouseenter', () => { drillBtn.style.background = '#7c5cf725'; drillBtn.style.borderColor = '#7c5cf760'; });
                drillBtn.addEventListener('mouseleave', () => { drillBtn.style.background = '#7c5cf715'; drillBtn.style.borderColor = '#7c5cf730'; });
                drillBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderSubtopics(area, c, topicName);
                });
                details.appendChild(drillBtn);
            }

            details.appendChild(el('div', { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#444', margin: '14px 0 6px' }, 'Actions'));
            const actionRow = el('div', { display: 'flex', gap: '6px' });
            [
                { label: '✦ Explain', c: '#7c5cf7', action: () => document.dispatchEvent(new CustomEvent('eduai-explain-concept', { detail: { name: c.name } })) },
                { label: '🎯 Practice', c: '#10b981', action: () => document.dispatchEvent(new CustomEvent('eduai-practice-concept', { detail: { concept: c.name } })) },
            ].forEach(a => {
                const btn = el('div', {
                    flex: '1', padding: '8px', textAlign: 'center',
                    background: `${a.c}15`, border: `1px solid ${a.c}30`,
                    borderRadius: '6px', color: a.c, fontSize: '10px', fontWeight: '700',
                    cursor: 'pointer', transition: 'all 0.15s',
                }, a.label);
                btn.addEventListener('mouseenter', () => { btn.style.background = `${a.c}25`; btn.style.borderColor = `${a.c}60`; });
                btn.addEventListener('mouseleave', () => { btn.style.background = `${a.c}15`; btn.style.borderColor = `${a.c}30`; });
                btn.addEventListener('click', (e) => { e.stopPropagation(); a.action(); });
                actionRow.appendChild(btn);
            });
            details.appendChild(actionRow);
            card.appendChild(details);

            header.addEventListener('click', () => {
                const open = details.style.display !== 'none';
                details.style.display = open ? 'none' : 'block';
                card.style.borderColor = open ? '#1a1a34' : color.border + '60';
            });

            listContainer.appendChild(card);
        });
    }

    renderList();
}

// ── Subtopic drill-down ──

async function renderSubtopics(area: HTMLElement, parent: any, topicName: string) {
    while (area.firstChild) area.removeChild(area.firstChild);
    const wrap = el('div', { padding: '14px' });
    area.appendChild(wrap);

    // Back button
    const back = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px',
        cursor: 'pointer', marginBottom: '14px', padding: '6px 0',
    });
    const bArr = el('span', { fontSize: '14px', color: '#7c5cf7', fontWeight: '600', display: 'inline-block', transition: 'transform 0.15s ease' }, '◂');
    const bLbl = el('span', { fontSize: '12px', fontWeight: '600', color: '#888' }, 'Back to concepts');
    back.appendChild(bArr);
    back.appendChild(bLbl);
    back.addEventListener('mouseenter', () => { bArr.style.transform = 'translateX(-3px)'; bLbl.style.color = '#fff'; });
    back.addEventListener('mouseleave', () => { bArr.style.transform = 'translateX(0)'; bLbl.style.color = '#888'; });
    back.addEventListener('click', () => {
        while (area.firstChild) area.removeChild(area.firstChild);
        renderConcepts(area, null, topicName);
    });
    wrap.appendChild(back);

    // Parent heading
    const color = statusToColor(parent.status);
    const heading = el('div', { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' });
    heading.appendChild(el('div', { fontSize: '15px', fontWeight: '700', color: '#fff' }, parent.name));
    heading.appendChild(el('div', {
        fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px',
        background: color.bg, color: color.text, letterSpacing: '0.5px',
    }, color.label));
    wrap.appendChild(heading);
    wrap.appendChild(el('div', {
        fontSize: '11px', color: '#555', marginBottom: '16px',
    }, `Mastery: ${Math.round(parent.score)}%`));

    // Loading
    const loader = el('div', { textAlign: 'center', padding: '20px', fontSize: '11px', color: '#555' }, 'Loading subtopics…');
    wrap.appendChild(loader);

    try {
        const res = await fetch(
            `http://localhost:8000/knowledge/concepts?id=${encodeURIComponent(parent.id)}`
        );
        if (!res.ok) throw new Error('Failed to fetch');
        const raw: any[] = await res.json();
        wrap.removeChild(loader);

        if (raw.length === 0) {
            wrap.appendChild(el('div', {
                padding: '24px', textAlign: 'center', color: '#444', fontSize: '10px',
                border: '1px dashed #1a1a34', borderRadius: '8px',
            }, 'No subtopics recorded yet.'));
            return;
        }

        const subtopics = raw.map(c => {
            const m = compute_mastery(
                c.times_encountered ?? 0, c.quiz_correct ?? 0,
                c.quiz_incorrect ?? 0, c.total_time_spent ?? 0,
                c.confidence_sum ?? 0, c.last_seen ?? ''
            );
            return {
                id: c.id, name: c.name, mastery: m.score / 100,
                score: m.score, status: m.status,
                encounters: c.times_encountered ?? 0,
                lastSeen: c.last_seen ?? null,
                subtopicCount: c.subtopic_count ?? 0,
            };
        });

        subtopics.forEach(c => {
            const sc = statusToColor(c.status);
            const card = el('div', {
                background: '#111125', borderRadius: '10px', border: '1px solid #1a1a34',
                marginBottom: '6px', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: '8px',
            });

            const topRow = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' });
            const nameWrap = el('div', { display: 'flex', alignItems: 'center', gap: '8px', flex: '1', overflow: 'hidden' });
            nameWrap.appendChild(el('span', { width: '8px', height: '8px', borderRadius: '50%', background: sc.border, flexShrink: '0' }));
            nameWrap.appendChild(el('div', { fontSize: '12px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, c.name));
            topRow.appendChild(nameWrap);
            topRow.appendChild(el('div', {
                fontSize: '8px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px',
                background: sc.bg, color: sc.text, letterSpacing: '0.5px', flexShrink: '0',
            }, sc.label));
            card.appendChild(topRow);

            const mBar = el('div', { height: '4px', background: '#0a0a18', borderRadius: '2px', overflow: 'hidden' });
            mBar.appendChild(el('div', { height: '100%', width: `${c.mastery * 100}%`, background: sc.border, transition: 'width 0.3s' }));
            card.appendChild(mBar);

            const meta = el('div', { display: 'flex', gap: '10px', fontSize: '9px', color: '#555' });
            meta.appendChild(el('span', {}, `${c.encounters} encounter${c.encounters !== 1 ? 's' : ''}`));
            meta.appendChild(el('span', {}, '·'));
            meta.appendChild(el('span', {}, formatLastSeen(c.lastSeen)));
            card.appendChild(meta);

            wrap.appendChild(card);
        });
    } catch {
        wrap.removeChild(loader);
        wrap.appendChild(el('div', {
            padding: '24px', textAlign: 'center', color: '#555', fontSize: '10px',
        }, 'Could not load subtopics.'));
    }
}
