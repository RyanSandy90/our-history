import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { TimelineModelViewer } from "./modelViewerRuntime";
import { PINNED_HISTORY_QUERY } from "./scroll";

export type StartTimelineModels = () => Promise<TimelineModelViewer | null>;

/** Own the prepared models for one timeline, including portable embed remounts. */
export function useTimelineModels(section: RefObject<HTMLElement | null>, assetBase: string) {
  const scope = useRef<{
    assetBase: string;
    start: StartTimelineModels;
    dispose(): void;
  } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const getScope = useCallback(() => {
    if (scope.current?.assetBase === assetBase) return scope.current;
    scope.current?.dispose();
    let alive = true;
    let viewer: TimelineModelViewer | undefined;
    let pending: Promise<TimelineModelViewer | null> | undefined;
    const current = {
      assetBase,
      start() {
        if (!pending) {
          setState("loading");
          pending = import("./modelViewerRuntime").then(({ createTimelineModelViewer }) => {
            if (!alive) return null;
            viewer = createTimelineModelViewer(assetBase);
            void viewer.ready.then(ready => { if (alive) setState(ready ? "ready" : "error"); });
            return viewer;
          }).catch(error => {
            if (alive) { console.warn("Aquinas 3D viewer could not start", error); setState("error"); }
            return null;
          });
        }
        return pending;
      },
      dispose() { alive = false; viewer?.dispose(); },
    };
    scope.current = current;
    setState("idle");
    return current;
  }, [assetBase]);
  const start = useCallback<StartTimelineModels>(() => getScope().start(), [getScope]);

  useEffect(() => {
    const current = getScope();
    // Warm pinned-journey GPU resources behind the opening curtain. Even asynchronous
    // shader compilation has a first-upload cost that should precede scrolling.
    if (window.matchMedia(PINNED_HISTORY_QUERY).matches) void current.start();
    // Native/reduced-motion layouts retain the approach-to-timeline fallback.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void current.start();
    }, { rootMargin: "100% 0px" });
    observer.observe(section.current!);
    return () => {
      observer.disconnect();
      current.dispose();
      if (scope.current === current) scope.current = null;
    };
  }, [getScope, section]);

  return { start, state };
}
