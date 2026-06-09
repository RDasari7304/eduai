import { el } from '../../util/utils';
import { lbl } from '../../util/ui';

export function renderSummary(area: HTMLElement, data: any) {
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