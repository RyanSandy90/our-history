import { Fragment, useEffect } from "react";
import { motion } from "motion/react";
import useReducedMotionPreference from "./useReducedMotionPreference";

const lines = [
  "Our story began in 1894.",
  "Generations of Aquinians continue to shape it.",
].map(line => line.split(" "));

export default function HeroTagline({ revealed, onRevealComplete }: { revealed: boolean; onRevealComplete: () => void }) {
  const reduced = useReducedMotionPreference();
  useEffect(() => {
    if (revealed && reduced) onRevealComplete();
  }, [revealed, reduced, onRevealComplete]);

  return <p className="history-hero-tagline">
    {lines.map((words, lineIndex) => <span className="history-focus-line" key={lineIndex}>
      {words.map((word, index) => <Fragment key={index}>
        {reduced ? <span className="history-focus-word">{word}</span> : <motion.span className="history-focus-word" initial={false}
          animate={revealed ? { opacity: 1, filter: "blur(0px)", y: 0 } : { opacity: 0, filter: "blur(8px)", y: 6 }}
          transition={{ duration: .9, delay: revealed ? .85 + lineIndex * .48 + index * .085 : 0, ease: [.22, 1, .36, 1] }}
          onAnimationComplete={() => {
            if (revealed && lineIndex === lines.length - 1 && index === words.length - 1) onRevealComplete();
          }}>
          {word}
        </motion.span>}
        {index < words.length - 1 ? " " : null}
      </Fragment>)}
    </span>)}
  </p>;
}
