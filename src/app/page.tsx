import HistoryExperience from "../history/HistoryExperience";

export default function Home() {
  // One route: introduction panels and timeline years are sections of this experience.
  return <HistoryExperience startAtHero />;
}
