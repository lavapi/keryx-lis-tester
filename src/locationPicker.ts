import { LOCATIONS, type Location } from "./locations.js";

export type RandomFn = () => number;

export const pickLocation = (rng: RandomFn = Math.random): Location => {
  const idx = Math.min(LOCATIONS.length - 1, Math.floor(rng() * LOCATIONS.length));
  return LOCATIONS[idx] as Location;
};
