import { contentArea } from '../../util/state';
import { el } from '../../util/utils';
import { lbl, collapsibleSection } from '../../util/ui';

// ─── Removable Card Helper ──────────────────────────────────
function makeRemovableCard(cardEl: HTMLElement, topicName: string) {
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

// ─── Section Renderers ──────────────────────────────────────
function renderSearchBar(sec: HTMLElement) {
    const searchWrap = el('div', { display: 'flex', gap: '6px', marginBottom: '14px' });
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
        searchWrap.after(customSec);
    });
    (searchInput as HTMLInputElement).addEventListener('keydown', (e) => { if (e.key === 'Enter') searchBtn.click(); });

    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(searchBtn);
    sec.appendChild(searchWrap);
}

function renderDifficultyToggle(sec: HTMLElement) {
    const diffWrap = el('div', {
        display: 'flex', gap: '0px', marginBottom: '14px',
        borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a34',
    });
    ['All', 'Beginner', 'Intermediate', 'Advanced'].forEach((label, i) => {
        const pill = el('button', {
            flex: '1', padding: '6px 0', background: i === 0 ? '#7c5cf7' : '#111125',
            color: i === 0 ? '#fff' : '#555', border: 'none',
            fontSize: '9px', fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.3px',
        }, label);
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
}

function renderStudyTime(sec: HTMLElement, topicName: string) {
    const timeCard = el('div', {
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
        background: '#111125', borderRadius: '8px', border: '1px solid #1a1a34', marginBottom: '14px',
    });
    timeCard.appendChild(el('span', { fontSize: '16px' }, '⏱'));
    const timeInfo = el('div', { flex: '1' });
    timeInfo.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd' }, `23 minutes studying ${topicName}`));
    timeInfo.appendChild(el('div', { fontSize: '8px', color: '#444', marginTop: '2px' }, 'Across 2 pages · 14 sections read'));
    timeCard.appendChild(timeInfo);
    sec.appendChild(timeCard);
}

function renderPagesStudied(sec: HTMLElement, sources: string[]) {
    if (!sources || sources.length === 0) return;
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
        info.appendChild(el('div', { fontSize: '11px', color: '#99b', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset', lineHeight: '1.3' }, display));
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

function renderKhanAcademy(sec: HTMLElement, topicName: string) {
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
        card.appendChild(el('div', {
            width: '32px', height: '32px', borderRadius: '6px', flexShrink: '0',
            background: item.type === 'video' ? '#1b5e3b' : '#1a3a6b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
        }, item.type === 'video' ? '▶' : '✎'));
        const info = el('div', { flex: '1', overflow: 'hidden' });
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset', lineHeight: '1.3' }, item.title));
        const meta = el('div', { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' });
        meta.appendChild(el('span', { fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '6px', background: item.type === 'video' ? '#1b5e3b40' : '#1a3a6b40', color: item.type === 'video' ? '#4ade80' : '#60a5fa', textTransform: 'uppercase' }, item.type === 'video' ? 'Video' : 'Exercise'));
        meta.appendChild(el('span', { fontSize: '8px', color: '#444' }, item.type === 'video' ? item.duration! : item.questions!));
        meta.appendChild(el('span', { fontSize: '8px', color: '#333' }, '·'));
        meta.appendChild(el('span', { fontSize: '8px', color: '#333' }, item.unit));
        info.appendChild(meta);
        card.appendChild(info);
        makeRemovableCard(card, topicName);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#2a4a2a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        khan.content.appendChild(card);
    });
    sec.appendChild(khan.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));
}

function renderYouTube(sec: HTMLElement, topicName: string) {
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
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset', lineHeight: '1.3' }, item.title));
        info.appendChild(el('div', { fontSize: '9px', color: '#ff6b6b', marginTop: '3px', fontWeight: '600' }, item.channel));
        info.appendChild(el('div', { fontSize: '8px', color: '#444', marginTop: '1px' }, item.views));
        card.appendChild(thumbWrap);
        card.appendChild(info);
        makeRemovableCard(card, topicName);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#4a2a2a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        yt.content.appendChild(card);
    });
    sec.appendChild(yt.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));
}

function renderQuizlet(sec: HTMLElement, topicName: string) {
    const quizlet = collapsibleSection('Quizlet', false);
    [
        { title: `${topicName} — Key Terms & Definitions`, cards: '42 terms', author: 'StudyPro' },
        { title: `AP Calculus: ${topicName}`, cards: '28 terms', author: 'MathMaster' },
    ].forEach(item => {
        const card = el('div', {
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            background: '#111125', borderRadius: '8px', border: '1px solid #1a1a34',
            marginBottom: '6px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        });
        card.appendChild(el('div', { width: '32px', height: '32px', borderRadius: '6px', flexShrink: '0', background: '#1a3a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#4ecdc4' }, '📚'));
        const info = el('div', { flex: '1', overflow: 'hidden' });
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#ddd', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset', lineHeight: '1.3' }, item.title));
        const meta = el('div', { display: 'flex', gap: '6px', marginTop: '3px' });
        meta.appendChild(el('span', { fontSize: '8px', color: '#4ecdc4', fontWeight: '600' }, item.cards));
        meta.appendChild(el('span', { fontSize: '8px', color: '#333' }, `by ${item.author}`));
        info.appendChild(meta);
        card.appendChild(info);
        makeRemovableCard(card, topicName);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#2a4a4a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        quizlet.content.appendChild(card);
    });
    sec.appendChild(quizlet.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));
}

function renderResearch(sec: HTMLElement, topicName: string) {
    const research = collapsibleSection('Research & Deep Dives', false);
    [
        { title: `A Survey of Modern Approaches to ${topicName}`, authors: 'J. Smith, A. Chen', year: '2023', source: 'arXiv', tag: 'Survey' },
        { title: `${topicName}: Foundations and Applications`, authors: 'R. Patel et al.', year: '2022', source: 'JSTOR', tag: 'Textbook' },
        { title: `Teaching ${topicName}: A Pedagogical Perspective`, authors: 'M. Williams', year: '2024', source: 'Google Scholar', tag: 'Education' },
    ].forEach(item => {
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
        makeRemovableCard(card, topicName);
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#2a2a4a'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1a1a34'; card.style.background = '#111125'; });
        research.content.appendChild(card);
    });
    sec.appendChild(research.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));
}

function renderGaps(sec: HTMLElement) {
    const explore = collapsibleSection('📍 Haven\'t Explored Yet', false);
    [
        { name: 'Implicit Differentiation', reason: 'Key technique in Calculus' },
        { name: 'Related Rates', reason: 'Application of derivatives' },
        { name: 'L\'Hôpital\'s Rule', reason: 'Uses derivatives for limits' },
        { name: 'Taylor Series', reason: 'Builds on derivative concepts' },
    ].forEach(gap => {
        const card = el('div', {
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            background: '#0e0e22', borderRadius: '8px', border: '1px dashed #1e1e3a',
            marginBottom: '5px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        });
        card.appendChild(el('div', { width: '6px', height: '6px', borderRadius: '50%', background: '#fdcb6e', flexShrink: '0' }));
        const info = el('div', { flex: '1' });
        info.appendChild(el('div', { fontSize: '11px', fontWeight: '600', color: '#aaa' }, gap.name));
        info.appendChild(el('div', { fontSize: '8px', color: '#444', marginTop: '2px' }, gap.reason));
        card.appendChild(info);
        card.appendChild(el('span', { fontSize: '8px', color: '#7c5cf7', fontWeight: '700', padding: '2px 6px', borderRadius: '6px', background: '#7c5cf715', flexShrink: '0' }, 'Explore'));
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#7c5cf740'; card.style.background = '#111128'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#1e1e3a'; card.style.background = '#0e0e22'; });
        explore.content.appendChild(card);
    });
    sec.appendChild(explore.wrapper);
    sec.appendChild(el('div', { height: '1px', background: '#1a1a34', margin: '14px 0' }));
}


// ─── Scroll Indicators ──────────────────────────────────────
export function addScrollIndicators(sec: HTMLElement) {
    setTimeout(() => {
        const scrollParent = contentArea;
        if (!scrollParent) return;
        const bottomPill = el('div', { position: 'sticky', bottom: '0', left: '0', right: '0', padding: '6px 12px', margin: '0 -14px', background: 'linear-gradient(transparent, #0c0c18 30%)', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: '10' });
        const bottomInner = el('div', { padding: '8px 16px', background: '#1e1e40', borderRadius: '16px', border: '1px solid #7c5cf740', fontSize: '12px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto', cursor: 'pointer', boxShadow: '0 -6px 24px rgba(124,92,247,0.15)', transition: 'opacity 0.2s, transform 0.2s', fontWeight: '600' });
        bottomPill.appendChild(bottomInner);
        const topPill = el('div', { position: 'sticky', top: '0', left: '0', right: '0', padding: '6px 12px', margin: '0 -14px', background: 'linear-gradient(#0c0c18 30%, transparent)', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: '10' });
        const topInner = el('div', { padding: '8px 16px', background: '#1e1e40', borderRadius: '16px', border: '1px solid #7c5cf740', fontSize: '12px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto', cursor: 'pointer', boxShadow: '0 6px 24px rgba(124,92,247,0.15)', transition: 'opacity 0.2s, transform 0.2s', fontWeight: '600' });
        topPill.appendChild(topInner);

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
            const above: string[] = [], below: string[] = [];
            sections.forEach(s => {
                const rect = s.el.getBoundingClientRect();
                if (rect.bottom < containerRect.top + 60) above.push(s.label);
                else if (rect.top > containerRect.bottom - 40) below.push(s.label);
            });
            if (below.length > 0) {
                const text = below.length <= 2 ? below.join(', ') : `${below[0]}, ${below[1]} +${below.length - 2} more`;
                bottomInner.textContent = '';
                bottomInner.appendChild(el('span', { color: '#7c5cf7', fontSize: '14px', fontWeight: '800' }, '▾'));
                bottomInner.appendChild(el('span', {}, text));
                bottomPill.style.display = 'flex';
            } else bottomPill.style.display = 'none';
            if (above.length > 0) {
                const text = above.length <= 2 ? above.join(', ') : `${above[0]}, ${above[1]} +${above.length - 2} more`;
                topInner.textContent = '';
                topInner.appendChild(el('span', { color: '#7c5cf7', fontSize: '14px', fontWeight: '800' }, '▴'));
                topInner.appendChild(el('span', {}, text));
                topPill.style.display = 'flex';
            } else topPill.style.display = 'none';
        }

        bottomInner.addEventListener('click', () => { const b = sections.filter(s => s.el.getBoundingClientRect().top > window.innerHeight * 0.5); if (b.length > 0) b[0].el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        topInner.addEventListener('click', () => { const a = sections.filter(s => s.el.getBoundingClientRect().bottom < 100); if (a.length > 0) a[a.length - 1].el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

        sec.insertBefore(topPill, sec.firstChild);
        sec.appendChild(bottomPill);
        contentArea.addEventListener('scroll', updateIndicators);
        updateIndicators();
    }, 100);
}

// ─── Main Resources Renderer ────────────────────────────────
export function renderLinks(area: HTMLElement, data: any, sources: string[]) {
    const sec = el('div', { padding: '4px 14px 14px' });
    const topicName = data?.topic || 'Topic';

    renderSearchBar(sec);
    renderDifficultyToggle(sec);
    renderStudyTime(sec, topicName);
    renderPagesStudied(sec, sources);
    renderKhanAcademy(sec, topicName);
    renderYouTube(sec, topicName);
    renderQuizlet(sec, topicName);
    renderResearch(sec, topicName);
    renderGaps(sec);

    addScrollIndicators(sec);
    area.appendChild(sec);
}
 