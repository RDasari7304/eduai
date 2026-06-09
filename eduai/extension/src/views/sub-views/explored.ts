import { el, navigateTo } from "../../util/utils";
import { viewExplain } from "../explain";

function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
}

export function renderExplored(area: HTMLElement, metadata: any, sources: string[], topicName?: string) {
    const wrap = el('div', { padding: '14px' });

    const headerRow = el('div', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: '12px',
    });
    headerRow.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#444',
    }, 'Explored Queries'));
    const countLabel = el('div', {
        fontSize: '10px', color: '#666', fontWeight: '600',
    }, '...');
    headerRow.appendChild(countLabel);
    wrap.appendChild(headerRow);

    const loader = el('div', {
        padding: '40px 20px', textAlign: 'center', color: '#555',
    });
    const spinner = el('div', {
        width: '14px', height: '14px',
        border: '2px solid #1a1a34', borderTop: '2px solid #7c5cf7',
        borderRadius: '50%', margin: '0 auto 10px',
    });
    spinner.className = 'eduai-spinner';
    loader.appendChild(spinner);
    loader.appendChild(el('div', { fontSize: '10px', color: '#555' }, 'Loading explorations...'));
    wrap.appendChild(loader);
    area.appendChild(wrap);

    // Build fetch URL: prefer topic-based filtering, fall back to URL-based
    let fetchUrl: string;
    if (topicName) {
        fetchUrl = `http://localhost:8000/explanations?topic=${encodeURIComponent(topicName)}&urls=${encodeURIComponent(sources.join(','))}`;
    } else if (sources.length > 0) {
        fetchUrl = `http://localhost:8000/explanations?urls=${encodeURIComponent(sources.join(','))}`;
    } else {
        renderEmpty(wrap, loader, countLabel);
        return;
    }

    fetch(fetchUrl)
        .then(r => r.json())
        .then(d => {
            const items = (d.explanations || []) as Array<{
                id: number;
                selected_text: string;
                heading: string;
                context: string;
                explanation: string;
                url: string;
                created_at: string;
            }>;

            wrap.removeChild(loader);
            countLabel.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;

            if (items.length === 0) {
                renderEmpty(wrap, null, countLabel);
                return;
            }

            items.forEach(item => {
                const card = el('div', {
                    padding: '12px 40px 12px 14px', background: '#111125', borderRadius: '8px',
                    border: '1px solid #1a1a34', marginBottom: '8px', cursor: 'pointer',
                    transition: 'all 0.1s', position: 'relative',
                });

                const deleteBtn = el('div', {
                    position: 'absolute', top: '0', right: '0', bottom: '0',
                    width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', color: '#444', cursor: 'pointer', transition: 'all 0.15s',
                    opacity: '0', background: 'transparent', zIndex: '2',
                }, '✕');

                deleteBtn.addEventListener('mouseenter', (e) => {
                    e.stopPropagation();
                    deleteBtn.style.color = '#ff6b6b';
                    deleteBtn.style.background = '#5e1b1b40';
                });
                deleteBtn.addEventListener('mouseleave', (e) => {
                    e.stopPropagation();
                    deleteBtn.style.color = '#444';
                    deleteBtn.style.background = 'transparent';
                });
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    fetch(`http://localhost:8000/explanations/${item.id}`, { method: 'DELETE' })
                        .then(r => r.json())
                        .then(() => {
                            card.style.transition = 'all 0.1s';
                            card.style.opacity = '0';
                            card.style.transform = 'translateX(20px)';
                            setTimeout(() => {
                                if (card.parentNode) card.parentNode.removeChild(card);
                                const remaining = wrap.querySelectorAll('[data-explored-card]').length;
                                countLabel.textContent = `${remaining} ${remaining === 1 ? 'item' : 'items'}`;
                                if (remaining === 0) renderEmpty(wrap, null, countLabel);
                            }, 200);
                        })
                        .catch(err => console.error('Delete failed:', err));
                });
                card.appendChild(deleteBtn);
                card.setAttribute('data-explored-card', '1');

                const topRow = el('div', {
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '6px', gap: '8px',
                });
                const headingChip = el('div', {
                    display: 'flex', alignItems: 'center', gap: '4px',
                    overflow: 'hidden', flex: '1',
                });
                headingChip.appendChild(el('span', { fontSize: '10px', color: '#7c5cf7' }, '✦'));
                headingChip.appendChild(el('span', {
                    fontSize: '9px', fontWeight: '700', color: '#a78bfa',
                    textTransform: 'uppercase', letterSpacing: '0.8px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }, item.heading || 'Untitled'));
                topRow.appendChild(headingChip);
                topRow.appendChild(el('span', {
                    fontSize: '9px', color: '#555', flexShrink: '0', fontWeight: '500',
                }, formatTimeAgo(new Date(item.created_at).getTime())));
                card.appendChild(topRow);

                const cleanPreview = item.selected_text
                    .replace(/\s+/g, ' ')
                    .replace(/^\W+|\W+$/g, '')
                    .trim();
                const preview = cleanPreview.length > 100 ? cleanPreview.substring(0, 100) + '…' : cleanPreview;
                card.appendChild(el('div', {
                    fontSize: '11px', color: '#bbb', lineHeight: '1.5',
                    fontStyle: 'italic', paddingLeft: '10px',
                    borderLeft: '2px solid #1a1a34',
                    fontFamily: '"Cambria Math", "Latin Modern Math", serif',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical',
                } as any, `"${preview}"`));

                const resourcesWrap = el('div', {
                    maxHeight: '0', overflow: 'visible',
                    transition: 'max-height 0.25s ease, margin-top 0.25s ease, opacity 0.2s ease 0.05s',
                    opacity: '0', marginTop: '0',
                });
                const resourcesInner = el('div', {
                    paddingTop: '10px', marginTop: '8px', borderTop: '1px solid #1a1a34',
                });

                resourcesInner.appendChild(el('div', {
                    fontSize: '8px', fontWeight: '700', textTransform: 'uppercase',
                    letterSpacing: '1px', color: '#444', marginBottom: '6px',
                }, 'Quick Actions'));

                const actionRow = el('div', { display: 'flex', gap: '4px', marginBottom: '10px' });

                const practiceBtn = el('div', {
                    flex: '1', padding: '6px 4px', textAlign: 'center',
                    background: '#10b98115', border: '1px solid #10b98130',
                    borderRadius: '6px', color: '#4ade80', fontSize: '9px',
                    fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
                }, '🎯 Practice');
                practiceBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('eduai-practice-concept', {
                        detail: { concept: item.heading, url: item.url }
                    }));
                });

                const explainBtn = el('div', {
                    flex: '1', padding: '6px 4px', textAlign: 'center',
                    background: '#3b82f615', border: '1px solid #3b82f630',
                    borderRadius: '6px', color: '#60a5fa', fontSize: '9px',
                    fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
                }, '✦ Open');
                explainBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigateTo(() => viewExplain(item.selected_text, item.heading, item.context, metadata, item.explanation));
                });

                [practiceBtn, explainBtn].forEach(btn => {
                    btn.addEventListener('mouseenter', () => btn.style.opacity = '0.8');
                    btn.addEventListener('mouseleave', () => btn.style.opacity = '1');
                });
                actionRow.appendChild(practiceBtn);
                actionRow.appendChild(explainBtn);
                resourcesInner.appendChild(actionRow);

                resourcesInner.appendChild(el('div', {
                    fontSize: '8px', fontWeight: '700', textTransform: 'uppercase',
                    letterSpacing: '1px', color: '#444', marginBottom: '6px',
                }, 'Search'));

                const searchQuery = encodeURIComponent(`${item.heading}`);
                const topicQuery = encodeURIComponent(item.heading || item.selected_text.substring(0, 40));

                [
                    { label: 'YouTube', icon: '▶', color: '#ff6b6b', url: `https://www.youtube.com/results?search_query=${searchQuery}+explained`, sub: 'Video explanations' },
                    { label: 'Khan Academy', icon: '📘', color: '#4ade80', url: `https://www.khanacademy.org/search?page_search_query=${topicQuery}`, sub: 'Exercises & articles' },
                    { label: 'Wikipedia', icon: '📖', color: '#60a5fa', url: `https://en.wikipedia.org/w/index.php?search=${topicQuery}`, sub: 'Reference article' },
                    { label: 'Google Scholar', icon: '🔬', color: '#c084fc', url: `https://scholar.google.com/scholar?q=${searchQuery}`, sub: 'Academic papers' },
                ].forEach(r => {
                    const link = el('a', {
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 8px', background: '#0a0a18',
                        borderRadius: '6px', border: '1px solid #1a1a34',
                        marginBottom: '4px', cursor: 'pointer',
                        transition: 'all 0.15s', textDecoration: 'none',
                    });
                    link.setAttribute('href', r.url);
                    link.setAttribute('target', '_blank');
                    link.addEventListener('click', (e) => e.stopPropagation());
                    link.addEventListener('mouseenter', () => { link.style.borderColor = r.color + '40'; link.style.background = '#111125'; });
                    link.addEventListener('mouseleave', () => { link.style.borderColor = '#1a1a34'; link.style.background = '#0a0a18'; });

                    link.appendChild(el('span', { fontSize: '12px', flexShrink: '0' }, r.icon));
                    const linkText = el('div', { flex: '1' });
                    linkText.appendChild(el('div', { fontSize: '10px', fontWeight: '600', color: r.color }, r.label));
                    linkText.appendChild(el('div', { fontSize: '8px', color: '#555', marginTop: '1px' }, r.sub));
                    link.appendChild(linkText);
                    link.appendChild(el('span', { fontSize: '9px', color: '#444' }, '↗'));
                    resourcesInner.appendChild(link);
                });

                resourcesWrap.appendChild(resourcesInner);
                card.appendChild(resourcesWrap);

                card.addEventListener('mouseenter', () => {
                    card.style.background = '#1a1a3a';
                    card.style.borderColor = '#7c5cf740';
                    deleteBtn.style.opacity = '1';
                    resourcesWrap.style.maxHeight = '500px';
                    resourcesWrap.style.opacity = '1';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.background = '#111125';
                    card.style.borderColor = '#1a1a34';
                    deleteBtn.style.opacity = '0';
                    resourcesWrap.style.maxHeight = '0';
                    resourcesWrap.style.opacity = '0';
                });
                card.addEventListener('click', () => {
                    navigateTo(() => viewExplain(
                        item.selected_text, item.heading, item.context,
                        metadata, item.explanation,
                    ));
                });

                wrap.appendChild(card);
            });
        })
        .catch(err => {
            wrap.removeChild(loader);
            countLabel.textContent = '';
            const errBox = el('div', {
                padding: '20px', textAlign: 'center', color: '#e17055',
                fontSize: '10px', border: '1px solid #5e1b1b40', borderRadius: '8px',
            }, `Failed to load: ${err.message}`);
            wrap.appendChild(errBox);
        });
}

function renderEmpty(wrap: HTMLElement, loader: HTMLElement | null, countLabel: HTMLElement) {
    if (loader && loader.parentNode) wrap.removeChild(loader);
    countLabel.textContent = '0 items';
    const empty = el('div', {
        padding: '40px 20px', textAlign: 'center', color: '#444',
        border: '1px dashed #1a1a34', borderRadius: '10px',
    });
    empty.appendChild(el('div', { fontSize: '28px', marginBottom: '10px', color: '#7c5cf7' }, '✦'));
    empty.appendChild(el('div', { fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: '600' }, 'No explorations yet'));
    empty.appendChild(el('div', { fontSize: '10px', color: '#444', lineHeight: '1.5' }, 'Hold Alt and click any element on a page to explore it. They will appear here for review.'));
    wrap.appendChild(empty);
}