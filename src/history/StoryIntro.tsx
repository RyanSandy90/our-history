import history from "../data/history.json";
import StaggeredWords from "./StaggeredWords";

const highlights = [
  ["faith, opportunity and community"],
  ["Catholic faith", "1894", "Edmund Rice"],
  ["people, places and moments", "Edmund Rice"],
];

function IntroWords({ text, phrases }: { text: string; phrases: string[] }) {
  const pattern = new RegExp(`(${phrases.map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(pattern).map((part, index) => phrases.includes(part)
    ? <mark className="history-intro-highlight" key={index}><StaggeredWords text={part} /></mark>
    : <StaggeredWords key={index} text={part} />);
}

// Figma Introduction GSAP 1, 2 and 3, in their authored reading order.
export default function StoryIntro() {
  return <section className="history-intro" id="history-intro" aria-label="Our heritage">
    {history.introFrames.map((text, index) => <div className="history-intro-panel" data-intro-frame={index + 1} key={text} role="region" aria-label={`Introduction ${index + 1} of 3`}>
      <div className="history-intro-stage"><p><IntroWords text={text} phrases={highlights[index]} /></p></div>
    </div>)}
  </section>;
}
