interface Particle {
  homeX: number; homeY: number; x: number; y: number;
  fromX: number; fromY: number; phase: number; tone: number;
}

const RETURN_SECONDS = 1.6;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Original, small-card particle treatment inspired by the public React Bits demo.
// Sample the existing image, including its object-fit crop and Aquinas red tint.
export function createParticleImage(card: HTMLElement, tint: string) {
  const image = card.querySelector("img");
  if (!image?.complete || !image.naturalWidth) return null;
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  const columns = Math.ceil(width / 2);
  const rows = Math.ceil(height / 2);
  const sample = document.createElement("canvas");
  sample.width = columns;
  sample.height = rows;
  const source = sample.getContext("2d", { willReadFrequently: true });
  if (!source) return null;
  const scale = Math.max(columns / image.naturalWidth, rows / image.naturalHeight);
  source.drawImage(image, (columns - image.naturalWidth * scale) / 2, (rows - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
  let pixels: Uint8ClampedArray;
  // Cross-origin assets without CORS retain the normal photograph instead.
  try { pixels = source.getImageData(0, 0, columns, rows).data; } catch { return null; }
  source.clearRect(0, 0, columns, rows);
  source.fillStyle = tint;
  source.fillRect(0, 0, 1, 1);
  const red = source.getImageData(0, 0, 1, 1).data;
  const colours = Array.from({ length: 64 }, (_, tone) => `rgb(${Math.round(red[0] * tone / 63)} ${Math.round(red[1] * tone / 63)} ${Math.round(red[2] * tone / 63)})`);
  const particles: Particle[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const offset = (row * columns + col) * 4;
    if (pixels[offset + 3] < 20) continue;
    const homeX = (col + .5) * width / columns;
    const homeY = (row + .5) * height / rows;
    particles.push({ homeX, homeY, x: homeX, y: homeY, fromX: homeX, fromY: homeY, phase: Math.random() * Math.PI * 2,
      tone: Math.round((pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722) / 255 * 63) });
  }
  // Colour buckets reduce fillStyle changes while drawing thousands of particles.
  const buckets = colours.map((_, tone) => particles.filter(particle => particle.tone === tone));
  const opacity = Number(card.style.opacity || 1);
  let pointer = { x: width / 2, y: height / 2 };
  let hovering = true;
  let returning = 0;
  let time = 0;
  let blend = 0;

  const move = (clientX: number, clientY: number) => {
    const box = card.getBoundingClientRect();
    pointer = { x: (clientX - box.left) * width / box.width, y: (clientY - box.top) * height / box.height };
  };
  const enter = () => { hovering = true; returning = 0; card.dataset.particles = "scattered"; };
  const leave = () => {
    if (!hovering) return;
    hovering = false;
    returning = 0;
    particles.forEach(particle => { particle.fromX = particle.x; particle.fromY = particle.y; });
    card.dataset.particles = "returning";
  };
  const restore = () => {
    card.style.removeProperty("--particle-image-opacity");
    delete card.dataset.particles;
  };
  enter();

  return {
    card, move, enter, leave, restore,
    draw(context: CanvasRenderingContext2D, seconds: number) {
      time += seconds;
      if (!hovering) returning += seconds;
      if (returning >= RETURN_SECONDS) { restore(); return false; }
      const targetBlend = hovering || returning < RETURN_SECONDS - .4 ? 1 : 1 - smooth((returning - RETURN_SECONDS + .4) / .4);
      blend += (targetBlend - blend) * (1 - Math.exp(-seconds * 18));
      card.style.setProperty("--particle-image-opacity", String(1 - blend));
      const matrix = new DOMMatrixReadOnly(card.style.transform);
      const spread = hovering ? smooth(time / .65) : 1 - smooth(returning / RETURN_SECONDS);
      const response = 1 - Math.exp(-seconds * 5);
      const cell = width / columns * (1.08 - spread * .3);
      context.globalAlpha = opacity * blend;
      for (let tone = 0; tone < buckets.length; tone++) {
        context.fillStyle = colours[tone];
        for (const particle of buckets[tone]) {
          if (hovering) {
            const dx = particle.homeX - pointer.x;
            const dy = particle.homeY - pointer.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const influence = Math.max(0, 1 - distance / (width * .9));
            const outward = width * (.24 + influence * .4) * spread;
            const curl = particle.phase + time * .65;
            const targetX = particle.homeX + dx / distance * outward + Math.cos(curl) * width * .23 * spread;
            const targetY = particle.homeY + dy / distance * outward + Math.sin(curl) * height * .32 * spread;
            particle.x += (targetX - particle.x) * response;
            particle.y += (targetY - particle.y) * response;
          } else {
            // Different return delays make the photograph assemble in a soft wave.
            const delay = particle.phase / (Math.PI * 2) * .45;
            const progress = smooth((returning - delay) / (RETURN_SECONDS - .4 - delay));
            particle.x = particle.fromX + (particle.homeX - particle.fromX) * progress;
            particle.y = particle.fromY + (particle.homeY - particle.fromY) * progress;
          }
          context.fillRect(matrix.m41 + particle.x - cell / 2, matrix.m42 + particle.y - cell / 2, cell, cell);
        }
      }
      context.globalAlpha = 1;
      return true;
    },
  };
}

export type ParticleImage = NonNullable<ReturnType<typeof createParticleImage>>;
