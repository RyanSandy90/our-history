import { useLayoutEffect, useRef } from "react";
import { animate } from "motion";
import history from "../data/history.json";

const paragraphs = history.acknowledgement.split(/(?=That acknowledgement remains)/);

export default function ApologyModal({ opener, onClose }: { opener: HTMLElement; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const requestClose = useRef(() => {});

  useLayoutEffect(() => {
    const modal = dialog.current!, panel = card.current!, copy = content.current!, shade = backdrop.current!;
    const html = document.documentElement;
    const saved = ["overflow", "padding-right"].map(property => ({ property, value: html.style.getPropertyValue(property), priority: html.style.getPropertyPriority(property) }));
    const previousVisibility = opener.style.visibility;
    const scrollbar = window.innerWidth - html.clientWidth;
    if (scrollbar) html.style.paddingRight = `${parseFloat(getComputedStyle(html).paddingRight) + scrollbar}px`;
    html.style.overflow = "hidden";
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: { stop: () => void }[] = [];
    let closing = false;
    let alive = true;
    const stop = () => { animations.forEach(animation => animation.stop()); animations = []; };
    const origin = () => {
      const source = opener.getBoundingClientRect();
      return {
        x: source.left + source.width / 2 - (panel.offsetLeft + panel.offsetWidth / 2),
        y: source.top + source.height / 2 - (panel.offsetTop + panel.offsetHeight / 2),
        scaleX: source.width / panel.offsetWidth,
        scaleY: source.height / panel.offsetHeight,
      };
    };
    const finish = () => {
      if (!alive) return;
      opener.style.visibility = previousVisibility;
      modal.close();
      if (opener.isConnected) opener.focus({ preventScroll: true });
      onClose();
    };
    const settle = () => {
      panel.style.transform = "none";
      panel.style.opacity = copy.style.opacity = shade.style.opacity = "1";
      copy.style.transform = "none";
      modal.dataset.phase = "open";
    };
    const close = () => {
      if (closing) return;
      closing = true;
      stop();
      modal.dataset.phase = "closing";
      if (preference.matches || !opener.isConnected) { finish(); return; }
      animations = [
        animate(copy, { opacity: 0 }, { duration: .12 }),
        animate(shade, { opacity: 0 }, { duration: .38 }),
        animate(panel, { ...origin(), opacity: .5 }, { duration: .42, ease: [.4, 0, .2, 1], onComplete: finish }),
      ];
    };
    requestClose.current = close;
    modal.showModal();
    modal.querySelector<HTMLElement>("#history-apology-title")?.focus({ preventScroll: true });
    panel.scrollTop = 0;
    modal.dataset.phase = "opening";
    opener.style.visibility = "hidden";
    if (preference.matches) settle();
    else {
      const from = origin();
      animations = [
        animate(shade, { opacity: [0, 1] }, { duration: .45 }),
        animate(panel, { x: [from.x, 0], y: [from.y, 0], scaleX: [from.scaleX, 1], scaleY: [from.scaleY, 1], opacity: [.5, 1] },
          { type: "spring", stiffness: 260, damping: 30, mass: .9, onComplete: () => { if (alive && !closing) modal.dataset.phase = "open"; } }),
        animate(copy, { opacity: [0, 1], y: [12, 0] }, { delay: .18, duration: .35, ease: [.22, 1, .36, 1] }),
      ];
    }
    const motionChange = () => {
      if (!preference.matches) return;
      stop();
      if (closing) finish(); else settle();
    };
    preference.addEventListener("change", motionChange);
    return () => {
      alive = false;
      stop();
      preference.removeEventListener("change", motionChange);
      modal.close();
      opener.style.visibility = previousVisibility;
      saved.forEach(({ property, value, priority }) => {
        if (value) html.style.setProperty(property, value, priority);
        else html.style.removeProperty(property);
      });
    };
  }, [opener, onClose]);

  return <dialog ref={dialog} className="history-apology" aria-labelledby="history-apology-title" aria-describedby="history-apology-description" data-lenis-prevent
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      // This card has one action; retain focus there in either tab direction.
      event.preventDefault();
      event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
    }}
    onCancel={event => { event.preventDefault(); requestClose.current(); }}
    onClick={event => { if (event.target === dialog.current || event.target === backdrop.current) requestClose.current(); }}>
    <div className="history-apology-backdrop" ref={backdrop} aria-hidden="true" />
    <div className="history-apology-card" ref={card}>
      <div className="history-apology-content" ref={content}>
        <div className="history-apology-copy">
          <h2 id="history-apology-title" tabIndex={-1}>Acknowledging<br />Our History</h2>
          <div id="history-apology-description" className="history-apology-text">{paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
        </div>
        <button type="button" className="history-button history-apology-return" onClick={() => requestClose.current()}>Return to Our History</button>
      </div>
    </div>
  </dialog>;
}
