import { useEffect, useId, useRef, type CSSProperties, type RefObject } from "react";

const SIZE = 112;
const REFRACTION = 48;
const POINTER_QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)";
const CONTROLS = "button:not(:disabled), a[href], [role='button']";
const NATIVE_CURSOR = "dialog[open], input, textarea, select, [contenteditable='true']";

// A radial sampling map bends the actual DOM backdrop through a convex lens.
// Original DOM implementation inspired by React Bits' WebGL Fluid Glass lens.
function refractionMap() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const pixels = context.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const dx = x - SIZE / 2, dy = y - SIZE / 2;
    const radius = Math.min(1, Math.hypot(dx, dy) / (SIZE / 2));
    const bend = .14 + .27 * radius ** 6;
    const offset = (y * SIZE + x) * 4;
    pixels.data[offset] = 255 * (.5 - dx * bend / REFRACTION);
    pixels.data[offset + 1] = 255 * (.5 - dy * bend / REFRACTION);
    pixels.data[offset + 2] = 128;
    pixels.data[offset + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL();
}

export default function FluidGlassCursor({ root, enabled }: {
  root: RefObject<HTMLElement | null>;
  enabled: boolean;
}) {
  const id = `history-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cursor = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const point = useRef<HTMLSpanElement>(null);
  const map = useRef<SVGFEImageElement>(null);

  useEffect(() => {
    const scope = root.current, overlay = cursor.current, glass = lens.current, dot = point.current;
    if (!enabled || !scope || !overlay || !glass || !dot) return;
    const texture = refractionMap();
    map.current?.setAttribute("href", texture);
    // WebKit/Gecko accept the URL syntax without rendering SVG backdrop filters,
    // so CSS.supports alone cannot choose their standard translucent fallback.
    overlay.dataset.refraction = String(!!texture && /(?:Chrome|Chromium)\//.test(navigator.userAgent) && CSS.supports("backdrop-filter", `url("#${id}")`));
    const media = window.matchMedia(POINTER_QUERY);
    let frame = 0, previousTime = 0, visible = false, selecting = false;
    let x = 0, y = 0, targetX = 0, targetY = 0;

    const hide = () => {
      visible = false;
      overlay.removeAttribute("data-visible");
      scope.removeAttribute("data-glass-cursor");
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const draw = (time: number) => {
      const dt = Math.min((time - previousTime) / 1000 || 1 / 60, .05);
      previousTime = time;
      const blend = 1 - Math.exp(-dt / .075);
      x += (targetX - x) * blend;
      y += (targetY - y) * blend;
      const dx = targetX - x, dy = targetY - y;
      const distance = Math.hypot(dx, dy);
      const stretch = Math.min(.09, distance / 1000);
      glass.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0) rotate(${Math.atan2(dy, dx)}rad) scale(${1 + stretch}, ${1 - stretch * .6})`;
      frame = visible && distance > .05 ? requestAnimationFrame(draw) : 0;
    };
    const move = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!media.matches || event.pointerType !== "mouse" || selecting || !target || target.closest(NATIVE_CURSOR) || document.querySelector("dialog[open]")) {
        hide();
        return;
      }
      targetX = event.clientX;
      targetY = event.clientY;
      overlay.dataset.interactive = String(!!target.closest(CONTROLS));
      dot.style.transform = `translate3d(${targetX - 1.5}px, ${targetY - 1.5}px, 0)`;
      if (!visible) {
        x = targetX; y = targetY;
        previousTime = performance.now();
        glass.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0)`;
        overlay.dataset.visible = "true";
        scope.dataset.glassCursor = "true";
        visible = true;
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const down = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(CONTROLS)) { selecting = true; hide(); }
      else overlay.dataset.pressed = "true";
    };
    const up = () => { selecting = false; overlay.removeAttribute("data-pressed"); };
    const key = (event: KeyboardEvent) => { if (event.key === "Tab") hide(); };
    const leave = () => { up(); hide(); };
    const visibility = () => { if (document.hidden) leave(); };
    // Native dialogs occupy the browser's top layer; restore the native pointer
    // immediately when one opens, including an unrelated WordPress host dialog.
    const dialogs = new MutationObserver(() => { if (document.querySelector("dialog[open]")) hide(); });
    dialogs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    scope.addEventListener("pointermove", move, { passive: true });
    scope.addEventListener("pointerleave", leave);
    scope.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", leave);
    window.addEventListener("blur", leave);
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", leave);
    return () => {
      leave();
      dialogs.disconnect();
      scope.removeEventListener("pointermove", move);
      scope.removeEventListener("pointerleave", leave);
      scope.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", leave);
      window.removeEventListener("blur", leave);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", leave);
    };
  }, [enabled, id, root]);

  return <div ref={cursor} className="history-glass-cursor" aria-hidden="true"
    style={{ "--glass-size": `${SIZE}px`, "--glass-filter": `url("#${id}")` } as CSSProperties}>
    <svg className="history-glass-filter" width="0" height="0" focusable="false">
      <defs><filter id={id} x="0" y="0" width={SIZE} height={SIZE} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feImage ref={map} width={SIZE} height={SIZE} result="bend" preserveAspectRatio="none" />
        <feDisplacementMap in="SourceGraphic" in2="bend" scale={REFRACTION} xChannelSelector="R" yChannelSelector="G" result="red" />
        <feColorMatrix in="red" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feDisplacementMap in="SourceGraphic" in2="bend" scale={REFRACTION - 1} xChannelSelector="R" yChannelSelector="G" result="green" />
        <feColorMatrix in="green" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feDisplacementMap in="SourceGraphic" in2="bend" scale={REFRACTION - 2} xChannelSelector="R" yChannelSelector="G" result="blue" />
        <feColorMatrix in="blue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feBlend in="r" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b" mode="screen" />
      </filter></defs>
    </svg>
    <div ref={lens} className="history-glass-lens"><div className="history-glass-surface" /></div>
    <span ref={point} className="history-glass-point" />
  </div>;
}
