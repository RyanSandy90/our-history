import { useEffect, useLayoutEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { gsap } from "gsap";
import { motion } from "motion/react";
import photoLabels from "../data/photo-labels.json";
import { assetUrl } from "./assets";
import HeroTagline from "./HeroTagline";
import useHeroParticles from "./useHeroParticles";
import useReducedMotionPreference from "./useReducedMotionPreference";

const rings = [
  { radius: 300, width: 80, opacity: .65, phase: 2.5, speed: .0264, years: ["1762", "1894", "1905", "1937", "1951", "2016", "1966", "2014"] },
  { radius: 470, width: 112, opacity: .82, phase: 7.5, speed: .018, years: ["2019", "1971", "2017", "1957", "2004", "1962", "1928", "1939", "1802-1803", "1896", "1868", "1955"] },
  { radius: 640, width: 144, opacity: 1, phase: 4, speed: .0132, years: ["1983", "2003", "2009", "2018", "1785", "1987", "2008", "1963", "1986", "1988", "1936", "1938", "1967", "1970", "1976", "1980"] },
];
const photos = rings.flatMap(ring => ring.years.map((year, index) => ({
  year, width: ring.width, opacity: ring.opacity, radius: ring.radius, speed: ring.speed,
  angle: ring.phase * Math.PI / 180 + index * Math.PI * 2 / ring.years.length,
})));
const labels: Record<string, string> = photoLabels;
// Centre of the white star within the original square crest export.
const STAR = { x: .5, y: .49 };
const INITIAL_ANCHOR = { x: 640, y: 281.02 };

function photoEdge(x: number, y: number, width: number, anchor: { x: number; y: number }) {
  const dx = anchor.x - x;
  const dy = anchor.y - y;
  const fraction = Math.min(width / 2 / Math.abs(dx), width * .375 / Math.abs(dy));
  return { x: x + dx * fraction, y: y + dy * fraction };
}

export default function HeroOrbit({ assetBase, revealed, onJourney, onRevealComplete, onApology }: { assetBase: string; revealed: boolean; onJourney: () => void; onRevealComplete: () => void; onApology: (event: MouseEvent<HTMLButtonElement>) => void }) {
  const reduced = useReducedMotionPreference();
  const orbit = useRef<HTMLDivElement>(null);
  const connections = useRef<SVGSVGElement>(null);
  const crest = useRef<HTMLImageElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const anchor = useRef(INITIAL_ANCHOR);
  const hoveredCard = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const svg = connections.current!;
    const logo = crest.current!;
    const updateAnchor = () => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const box = logo.getBoundingClientRect();
      const point = new DOMPoint(box.left + box.width * STAR.x, box.top + box.height * STAR.y).matrixTransform(matrix.inverse());
      anchor.current = point;
      svg.querySelectorAll("line").forEach((line, index) => {
        const photo = photos[index];
        const angle = photo.angle + elapsed.current * photo.speed;
        const edge = photoEdge(640 + Math.cos(angle) * photo.radius, 416 + Math.sin(angle) * photo.radius, photo.width, point);
        line.setAttribute("x1", String(edge.x));
        line.setAttribute("y1", String(edge.y));
        line.setAttribute("x2", String(point.x));
        line.setAttribute("y2", String(point.y));
      });
    };
    updateAnchor();
    const observer = new ResizeObserver(updateAnchor);
    observer.observe(content.current!);
    observer.observe(svg);
    window.addEventListener("resize", updateAnchor);
    return () => { observer.disconnect(); window.removeEventListener("resize", updateAnchor); };
  }, []);

  useEffect(() => {
    if (!revealed) return;
    const root = orbit.current!;
    const hero = root.closest<HTMLElement>(".history-hero")!;
    const preferences = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(root);
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".history-orbit-card"));
    const lines = Array.from(connections.current!.querySelectorAll("line"));
    const releaseHover = () => { hoveredCard.current = null; };
    const visibility = () => { if (document.hidden) releaseHover(); };
    const tick = (_time: number, delta: number) => {
      // An inert/offscreen hero may never deliver pointerleave. Release its
      // hover now so returning from a reading card resumes the photo rings.
      if (!visible || hero.inert || document.hidden) { releaseHover(); return; }
      if (preferences.matches || hoveredCard.current) return;
      elapsed.current += Math.min(delta, 50) / 1000;
      photos.forEach((photo, index) => {
        const angle = photo.angle + elapsed.current * photo.speed;
        const x = 640 + Math.cos(angle) * photo.radius;
        const y = 416 + Math.sin(angle) * photo.radius;
        const edge = photoEdge(x, y, photo.width, anchor.current);
        // Keep photos horizontal and use 2D motion: promoted photo layers can
        // retain clipped raster tiles after the parent returns from its 45× zoom.
        cards[index].style.transform = `translate(${x - photo.width / 2}px,${y - photo.width * .375}px)`;
        lines[index].setAttribute("x1", String(edge.x));
        lines[index].setAttribute("y1", String(edge.y));
      });
    };
    gsap.ticker.add(tick);
    window.addEventListener("blur", releaseHover);
    window.addEventListener("pointercancel", releaseHover);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); gsap.ticker.remove(tick); window.removeEventListener("blur", releaseHover); window.removeEventListener("pointercancel", releaseHover); document.removeEventListener("visibilitychange", visibility); };
  }, [revealed]);

  useHeroParticles(orbit, revealed);

  return <section className="history-hero" id="history-hero" aria-labelledby="history-hero-title">
    <motion.div className="history-hero-reveal" initial={false} animate={{ opacity: revealed ? 1 : 0, y: revealed || reduced ? 0 : 64, scale: revealed || reduced ? 1 : 1.06 }} transition={{ duration: reduced ? .15 : 1.25, ease: [.22, 1, .36, 1], delay: reduced ? 0 : .15 }}>
      <div className="history-hero-zoom">
      <div className="history-design-stage history-hero-stage">
        <div ref={orbit} className="history-orbit">
          <svg className="history-orbit-connections" ref={connections} width="1280" height="1108" viewBox="0 0 1280 1108" aria-hidden="true" focusable="false">
            {photos.map(photo => {
              const edge = photoEdge(640 + Math.cos(photo.angle) * photo.radius, 416 + Math.sin(photo.angle) * photo.radius, photo.width, INITIAL_ANCHOR);
              return <line key={photo.year} data-year={photo.year} x1={edge.x.toFixed(3)} y1={edge.y.toFixed(3)}
                x2={INITIAL_ANCHOR.x} y2={INITIAL_ANCHOR.y} strokeWidth="0.5pt" vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          {photos.map(photo => {
            const x = (640 + Math.cos(photo.angle) * photo.radius - photo.width / 2).toFixed(3);
            const y = (416 + Math.sin(photo.angle) * photo.radius - photo.width * .375).toFixed(3);
            const style = { width: photo.width, height: photo.width * .75, opacity: photo.opacity, transform: `translate(${x}px, ${y}px)` } satisfies CSSProperties;
            return <div className="history-orbit-card" key={photo.year} data-year={photo.year} style={style}
              onPointerMove={event => { if (event.pointerType !== "touch") hoveredCard.current = event.currentTarget; }}
              onPointerLeave={() => { hoveredCard.current = null; }}>
              <span className="history-orbit-year" aria-hidden="true" style={{ fontSize: photo.width * .4 }}>{labels[photo.year].split(" ")[0]}</span>
              <span className="history-orbit-photo"><img src={assetUrl(assetBase, `history/orbit/${photo.year}.webp`)} alt={labels[photo.year]} width={photo.width} height={photo.width * .75} draggable={false} /></span>
            </div>;
          })}
        </div>
        <div className="history-hero-content" ref={content}>
          <img className="history-crest" ref={crest} src={assetUrl(assetBase, "figma/crest.png")} width="98" height="98" alt="Aquinas College" fetchPriority="high" />
          <h1 id="history-hero-title">Our <span className="history-story-word">Story</span></h1>
          <HeroTagline revealed={revealed} onRevealComplete={onRevealComplete} />
          <div className="history-hero-actions">
            <button type="button" className="history-button history-button-neon history-start-journey" data-neon-ready={revealed} onClick={onJourney}>
              <span>Start Your Journey</span>
            </button>
          </div>
        </div>
      </div>
      </div>
      <button type="button" className="history-button history-hero-apology" onClick={onApology}>View Apology</button>
    </motion.div>
  </section>;
}
