const fontLoads = new Map<string, Promise<unknown>>();

export const assetUrl = (base: string, path: string) => `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

export function loadHistoryFonts(base: string) {
  if (fontLoads.has(base)) return fontLoads.get(base)!;
  // Ogg is supplied separately; public reviewers use the CSS serif fallback.
  const fonts = [
    ["Aquinas DM", "DMSans-Variable.woff2", "normal", "100 1000"],
  ];
  const promise = Promise.all(fonts.map(async ([family, file, style, weight]) => {
    const face = new FontFace(family, `url(${JSON.stringify(assetUrl(base, `fonts/${file}`))})`, { style, weight, display: "swap" });
    await face.load();
    document.fonts.add(face);
  }));
  fontLoads.set(base, promise);
  return promise;
}
