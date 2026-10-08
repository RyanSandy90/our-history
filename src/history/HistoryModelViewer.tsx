import { useEffect, useId, useRef, useState } from "react";
import { assetUrl } from "./assets";
import { historyModels, type HistoryModelKind } from "./models";
import type { StartTimelineModels } from "./useTimelineModels";

export default function HistoryModelViewer({ assetBase, kind, poster, label, startModels }: {
  assetBase: string; kind: HistoryModelKind; poster: string; label: string; startModels: StartTimelineModels;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instructions = useId();
  const interactive = historyModels[kind].interactive;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let alive = true, detach: (() => void) | undefined;
    setState("loading");
    void startModels().then(viewer => {
      if (!alive) return;
      if (!viewer) { setState("error"); return; }
      detach = viewer.attach(host.current!, kind, {
        onReady: () => { if (alive) setState("ready"); },
        onError: () => { if (alive) setState("error"); },
      });
    });
    return () => { alive = false; detach?.(); };
  }, [assetBase, kind, startModels]);

  return <div ref={host} className="history-model-viewer" data-model-state={state}
    data-model-interactive={interactive} data-lenis-prevent={interactive ? true : undefined}
    tabIndex={interactive && state === "ready" ? 0 : undefined} role={interactive ? "group" : "img"}
    aria-label={`${label}, ${interactive ? "interactive 3D model" : "3D front view"}`} aria-describedby={interactive ? instructions : undefined}>
    {state === "error" && <img className="history-model-poster" src={assetUrl(assetBase, poster)} alt="" draggable={false} />}
    {interactive && <span className="history-sr-only" id={instructions}>The model rotates automatically. Focus or interact to take control. On phones, swipe with one finger to continue the timeline; use two fingers to rotate and pinch to zoom. On larger screens, drag to rotate, scroll or pinch to zoom, and right-drag or use two fingers to pan. Arrow keys rotate; Shift and arrow keys pan; plus and minus zoom. Double-click, Home or R resets the view.</span>}
    <span className="history-sr-only" role="status">{state === "loading" ? "Loading 3D model." : state === "error" ? "The 3D model is unavailable. Showing the original render." : "3D model ready."}</span>
  </div>;
}
