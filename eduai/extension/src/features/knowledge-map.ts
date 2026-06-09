import { el } from '../util/utils';
import { showLoader } from '../util/ui';
 
export function getMasteryColor(s: number): string {
    if (s >= 85) return '#00b894'; if (s >= 65) return '#7c5cf7';
    if (s >= 40) return '#fdcb6e'; if (s >= 16) return '#e17055'; return '#636e72';
}
 
export function renderTreeNode(concept: any, depth: number): HTMLDivElement {
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
 
export async function renderKnowledgeMap() {
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