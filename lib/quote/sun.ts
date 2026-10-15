/**
 * Peak sun hours by state, from the three regional figures in the sizing spec of 2026-10-14. They are
 * approximate and on the low side, so a system still copes in the worst month; check them against NASA
 * POWER or PVGIS state by state before relying on them. States on the edge of a region take the lower
 * figure. Pure, so the wizard can list the states and the server can look them up.
 */

type Region = "south" | "middle" | "north";

export const REGION_SUN_HOURS: Record<Region, number> = { south: 4.0, middle: 5.0, north: 5.5 };

/** The 36 states and the FCT, as the wizard lists them. */
export const NIGERIAN_STATES: { name: string; region: Region }[] = [
  ...["Abia", "Akwa Ibom", "Anambra", "Bayelsa", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Imo", "Lagos", "Ogun", "Ondo", "Osun", "Oyo", "Rivers"].map(
    (name) => ({ name, region: "south" as const }),
  ),
  ...["Adamawa", "Bauchi", "Benue", "FCT (Abuja)", "Gombe", "Kaduna", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau", "Taraba"].map((name) => ({ name, region: "middle" as const })),
  ...["Borno", "Jigawa", "Kano", "Katsina", "Kebbi", "Sokoto", "Yobe", "Zamfara"].map((name) => ({ name, region: "north" as const })),
].sort((a, b) => a.name.localeCompare(b.name));

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)|\bstate\b|[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const ALIASES: Record<string, string> = { abuja: "fct", "federal capital territory": "fct", "cross-river": "cross river" };

/** Sun hours for the state the customer gave, or `fallback` when it is empty or not a Nigerian state. */
export function sunHoursFor(state: string | undefined, fallback: number): number {
  if (!state) return fallback;
  const k = ALIASES[key(state)] ?? key(state);
  const found = NIGERIAN_STATES.find((s) => key(s.name) === k);
  return found ? REGION_SUN_HOURS[found.region] : fallback;
}
