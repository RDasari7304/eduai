import { Readability } from "@mozilla/readability";
import { currentlyVisible, viewportTimers } from './state';
import { flushViewport } from './tracking';
 
export function extractWithReadability() {
    const title = document.title;
    const full_url = window.location.href;
    const hostname = window.location.hostname;
    const path_name = window.location.pathname;
    const clone = document.cloneNode(true) as Document;
    const reader = new Readability(clone);
    const article = reader.parse();
 
    const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, a, blockquote, pre, code');
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
            const e = entry.target as HTMLElement;
            if (entry.isIntersecting) currentlyVisible.add(e);
            if (!entry.isIntersecting) {
                if (viewportTimers.has(e)) { flushViewport(Date.now(), e, false); observer.unobserve(e); }
                currentlyVisible.delete(e);
            }
        });
    };
    const observer = new IntersectionObserver(observerCallback, { root: null, rootMargin: '-5% 0px -40% 0px', threshold: 0.5 });
    contentElements.forEach(element => {
        const h = element as HTMLElement;
        const tl = h.innerText.length;
        if (tl === 0) return;
        const cl = Array.from(h.children).reduce((a, c) => a + ((c as HTMLElement).innerText?.length || 0), 0);
        const pct = cl / tl * 100;
        if (!h.closest('#eduai-sidebar') && !h.closest('nav, footer, header, aside') && !h.closest('[role="navigation"], [role="banner"], [role="contentinfo"]') && tl >= 30 && pct <= 60) observer.observe(h);
    });
 
    return { title, full_url, hostname, path_name, textContent: article ? article.textContent : undefined, subject: null};
}
 