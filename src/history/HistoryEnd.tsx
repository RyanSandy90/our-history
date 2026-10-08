import { assetUrl } from "./assets";

export default function HistoryEnd({ siteBase, onRestart }: { siteBase: string; onRestart: () => void }) {
  return <section className="history-end" id="history-end" tabIndex={-1} aria-labelledby="history-end-title">
    <h2 id="history-end-title">Our Story Continues</h2>
    <div className="history-end-actions">
      <a className="history-button" href={assetUrl(siteBase, "community/old-aquinians-association/")}>Visit Alumni</a>
      <button className="history-button" type="button" onClick={onRestart}>Back to Start</button>
    </div>
  </section>;
}
