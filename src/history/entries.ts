import history from "../data/history.json";
import examples from "../data/figma-examples.json";
import { chapterModels } from "./models";

const captions: Partial<Record<string, string>> = {
  "1820": "Edmund Rice",
  "1844": "Edmund Rice",
  "1868": "Brother Treacy",
  "1896": "Boarders Picnic",
  "1905": "Alcock Shield Presentation (1909)",
};

// Archive copy determines the chapter sequence; Figma records only override its visuals.
export const timelineEntries = history.entries.filter(entry => entry.year >= 1762 && entry.year <= 1937).map(entry => {
  const example = examples.examples.find(item => item.date === entry.date);
  const image = example?.imageOverride ?? entry.image;
  return {
    ...entry,
    image: { ...image, sourceLabel: captions[entry.date] ?? image.sourceLabel },
    renderKind: chapterModels[entry.date] ?? ("photo" as const),
  };
});
