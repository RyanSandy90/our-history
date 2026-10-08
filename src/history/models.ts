export const historyModels = {
  cross: { file: "celtic-cross.glb", padding: 1.12, viewX: .18, viewY: .2, environmentIntensity: .45, interactive: true },
  building: { file: "cbc-perth-1894.glb", padding: 1.22, viewX: -.42, viewY: .2, environmentIntensity: .45, interactive: true },
  nano: { file: "nano-nagle.splat", padding: 1.02, viewX: 0, viewY: 0, environmentIntensity: .45, interactive: false },
} as const;

export type HistoryModelKind = keyof typeof historyModels;

export const chapterModels: Partial<Record<string, HistoryModelKind>> = {
  "1779": "cross",
  "1789": "cross",
  "1808": "nano",
  "1894": "building",
};
