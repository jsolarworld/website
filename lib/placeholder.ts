/**
 * The picture shown when a product has no photo or video yet: a grid of solar cells lit by a sun in one top corner.
 * Which corner, and which cells sit in deeper shade, come from the product's own name, so a page of placeholders is
 * not a wall of identical tiles and a product always gets the same picture. Pure, so the server and the browser
 * draw the same thing.
 */

export const PLACEHOLDER_GRID = 5;
/** Tone 0 is the warm light next to the sun; the last tone is the deepest shade. */
export const PLACEHOLDER_TONES = 4;

export interface PlaceholderArt {
  sun: "left" | "right";
  /** One tone per cell, row by row from the top. */
  tones: number[];
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function placeholderArt(seed: string): PlaceholderArt {
  // xorshift32: tiny, and gives the same numbers in Node and in every browser (Math.random would not).
  let state = hash(seed) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  const sun = next() < 0.5 ? "left" : "right";
  const tones: number[] = [];
  for (let row = 0; row < PLACEHOLDER_GRID; row++) {
    for (let col = 0; col < PLACEHOLDER_GRID; col++) {
      const fromSun = row + (sun === "left" ? col : PLACEHOLDER_GRID - 1 - col);
      const band = fromSun <= 1 ? 0 : fromSun <= 3 ? 1 : fromSun <= 5 ? 2 : 3;
      // About one cell in four sits a shade deeper than its neighbours, like panels catching the light unevenly.
      tones.push(Math.min(PLACEHOLDER_TONES - 1, band + (next() < 0.25 ? 1 : 0)));
    }
  }
  return { sun, tones };
}
