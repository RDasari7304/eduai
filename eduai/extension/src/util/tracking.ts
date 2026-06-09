import {
    viewedContent, viewportTimers, currentlyVisible,
    currentState, velocityHistory, lastScrollY, lastMouseMoveTime,
    lowVelocityTicks, highVelocityTicks,
    setCurrentState, setLastScrollY, setLastMouseMoveTime,
    setLowVelocityTicks, setHighVelocityTicks,
} from './state';
 
export function flushViewport(now: number, e: HTMLElement, routineCheck: boolean) {
    if (viewportTimers.has(e)) {
        const ts = viewportTimers.get(e)!;
        const elapsed = now - ts;
        const exists = viewedContent.some(x => x == `${e.tagName}: ${e.innerText}`);
        let pushed = false;
        const threshold = routineCheck ? 10 : 20;
        if (elapsed > threshold && !exists) {
            viewedContent.push(`${e.tagName}: ${e.innerText}` || '');
            pushed = true;
        }
        if (!routineCheck || pushed) viewportTimers.delete(e);
    }
}
 
export function startTracking() {
    setInterval(() => {
        const v = Math.abs(window.scrollY - lastScrollY);
        velocityHistory.shift();
        velocityHistory.push(v);
        setLastScrollY(window.scrollY);
        const sv = velocityHistory.reduce((a, b) => a + b, 0) / velocityHistory.length;
        let ns = currentState;
        const now = Date.now();
        switch (currentState) {
            case "reading":
                currentlyVisible.forEach(el => { if (!viewportTimers.has(el)) viewportTimers.set(el, now); });
                viewportTimers.forEach((_, e) => flushViewport(now, e, true));
                if (sv >= 60) { setHighVelocityTicks(highVelocityTicks + 1); if (highVelocityTicks >= 5) { ns = "scrolling"; setLowVelocityTicks(0); } }
                else if (sv == 0 && now - lastMouseMoveTime >= 45000) ns = "idle";
                else setHighVelocityTicks(0);
                break;
            case "scrolling":
                viewportTimers.forEach((_, e) => flushViewport(now, e, false));
                if (sv <= 10) { setLowVelocityTicks(lowVelocityTicks + 1); if (lowVelocityTicks >= 15) { ns = "reading"; setHighVelocityTicks(0); } }
                else setLowVelocityTicks(0);
                break;
            case "idle":
                if (sv > 0) ns = "scrolling";
        }
        if (ns != currentState) setCurrentState(ns);
    }, 100);
 
    document.onmousemove = () => {
        setLastMouseMoveTime(Date.now());
        if (currentState == "idle") setCurrentState("reading");
    };
}