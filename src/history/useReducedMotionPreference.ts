import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

// Motion's current hook snapshots this setting; these introduction effects need
// to stop immediately when a visitor changes their preference with the page open.
export default function useReducedMotionPreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
