import { contentArea } from './state';
 
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElementTagNameMap[K] {
    const n = document.createElement(tag);
    Object.assign(n.style, style);
    if (text) n.textContent = text;
    return n;
}
 
export function parseAIResponse(raw: string): any {
    try { return JSON.parse(raw); } catch {}
    const s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/\n/g, ' ').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/\s+/g, ' ');
    try { return JSON.parse(s); } catch {}
    const sub = s.substring(s.indexOf('{'), s.lastIndexOf('}') + 1);
    try { return JSON.parse(sub); } catch { return null; }
}
 
export function clear(node: HTMLElement) { while (node.firstChild) node.removeChild(node.firstChild); }
 
export function navigateTo(view: () => void) { clear(contentArea); view(); }
 
export function collectAllNames(node: any): string[] {
    const names: string[] = [];
    (node.children || []).forEach((c: any) => { names.push(c.name); names.push(...collectAllNames(c)); });
    return names;
}
 
export function parseSources(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
}