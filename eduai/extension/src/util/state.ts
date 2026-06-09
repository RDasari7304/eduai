// ─── Shared State ────────────────────────────────────────────
export const viewedContent: string[] = [];
export const viewportTimers: Map<HTMLElement, number> = new Map<HTMLElement, number>();
export const currentlyVisible: Set<HTMLElement> = new Set<HTMLElement>();
export let explainModeActive: boolean = false;
export let currHighlight: HTMLElement | null = null;
export let currentState: string = "reading";
export let velocityHistory: number[] = [0, 0, 0, 0, 0];
export let lastScrollY: number = window.scrollY;
export let stateStartTime: number = Date.now();
export let lastMouseMoveTime: number = stateStartTime;
export let lowVelocityTicks = 0;
export let highVelocityTicks = 0;
export let pageMetadata: any = null;
export function setPageMetadata(m: any) { pageMetadata = m; }
export const FONT_FAMILY = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
 
export const analyzedConcepts: { topic: string; subject: string; url: string; data: any }[] = [];
export let knowledgeTree: any = null;
export let contentArea: HTMLElement = null as any;
 
export function setCurrHighlight(el: HTMLElement | null) { currHighlight = el; }
export function setExplainModeActive(v: boolean) { explainModeActive = v; }
export function setCurrentState(s: string) { currentState = s; }
export function setLastScrollY(v: number) { lastScrollY = v; }
export function setLastMouseMoveTime(v: number) { lastMouseMoveTime = v; }
export function setLowVelocityTicks(v: number) { lowVelocityTicks = v; }
export function setHighVelocityTicks(v: number) { highVelocityTicks = v; }
export function setKnowledgeTree(data: any) { knowledgeTree = data; }
export function setContentArea(el: HTMLElement) { contentArea = el; }