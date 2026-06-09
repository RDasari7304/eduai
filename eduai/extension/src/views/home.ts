import { contentArea, knowledgeTree, viewedContent, analyzedConcepts, currentState } from '../util/state';
import { el, navigateTo, parseSources, collectAllNames } from '../util/utils';
import {viewDetail} from './detail';

export function viewHome(metadata: any) {
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
 