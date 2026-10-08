import { motion, useSpring, useTransform, type MotionValue } from "motion/react";

// Rolling digit approach adapted from React Bits Counter (David Haz).
// https://reactbits.dev/components/counter — licence in public/licenses/react-bits.txt.
function Numeral({ position, number }: { position: MotionValue<number>; number: number }) {
  const y = useTransform(position, latest => {
    const offset = (10 + number - latest % 10) % 10;
    return `${(offset > 5 ? offset - 10 : offset) * 100}%`;
  });
  return <motion.span className="history-counter-numeral" style={{ y }}>{number}</motion.span>;
}

function Column({ value, place }: { value: MotionValue<number>; place: number }) {
  const rounded = useTransform(value, latest => Math.floor(latest / place));
  const position = useSpring(rounded, { stiffness: 360, damping: 36, mass: .5 });
  return <span className="history-counter-column">
    {Array.from({ length: 10 }, (_, number) => <Numeral key={number} position={position} number={number} />)}
  </span>;
}

export default function YearCounter({ value, reduced }: { value: MotionValue<number>; reduced: boolean }) {
  return <div className="history-year-counter" aria-hidden="true">
    {reduced ? <span className="history-counter-static">2027</span> :
      [1000, 100, 10, 1].map(place => <Column key={place} value={value} place={place} />)}
  </div>;
}
