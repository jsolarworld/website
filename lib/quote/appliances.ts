import type { Appliance, QuoteItem } from "./types";

type Row = [id: string, name: string, category: Appliance["category"], watts: number, duty: number, surge: number, highDraw?: true];

// PRD 7.5 starter values. Typical ratings only: engineers confirm them before launch.
const ROWS: Row[] = [
  ["led-bulb", "LED bulb", "lighting", 10, 1, 1],
  ["phone-charger", "Phone charger", "work", 10, 1, 1],
  ["wifi-router", "Wi-Fi router", "work", 10, 1, 1],
  ["decoder", "Decoder", "entertainment", 20, 1, 1],
  ["cctv-kit", "CCTV kit (4 cameras and recorder)", "security", 40, 1, 1],
  ["tv-32", "TV, 32-inch LED", "entertainment", 50, 1, 1],
  ["led-security-light", "LED security light", "security", 50, 1, 1],
  ["standing-fan", "Standing fan", "cooling", 55, 1, 1],
  ["laptop", "Laptop", "work", 65, 1, 1],
  ["ceiling-fan", "Ceiling fan", "cooling", 75, 1, 1],
  ["tv-43", "TV, 43-inch LED", "entertainment", 80, 1, 1],
  ["sound-system", "Sound system", "entertainment", 100, 1, 1],
  ["tv-55", "TV, 55-inch LED", "entertainment", 110, 1, 1],
  ["refrigerator", "Refrigerator", "kitchen", 150, 0.4, 3],
  ["desktop-computer", "Desktop computer and monitor", "work", 200, 1, 1],
  ["chest-freezer", "Chest freezer", "kitchen", 200, 0.4, 3],
  ["blender", "Blender", "kitchen", 400, 1, 2],
  ["water-pump-half-hp", "Water pump, 0.5 HP", "water", 450, 1, 4],
  ["washing-machine", "Washing machine", "kitchen", 500, 0.5, 2],
  ["ac-1hp", "Air conditioner, 1 HP, non-inverter", "cooling", 900, 0.7, 3],
  ["microwave", "Microwave", "kitchen", 1000, 1, 1, true],
  ["pressing-iron", "Pressing iron", "work", 1000, 0.5, 1, true],
  ["ac-1-5hp", "Air conditioner, 1.5 HP, non-inverter", "cooling", 1300, 0.7, 3],
  ["electric-kettle", "Electric kettle", "kitchen", 1500, 1, 1, true],
  ["electric-cooker", "Electric cooker or hot plate", "kitchen", 1500, 0.6, 1, true],
  ["water-heater", "Water heater", "water", 2000, 0.5, 1, true],
];

export const APPLIANCES: Appliance[] = ROWS.map(
  ([id, name, category, watts, dutyCycle, surge, highDraw]) => ({
    id,
    name,
    category,
    watts,
    dutyCycle,
    surge,
    highDraw: highDraw ?? false,
  }),
);

/** Build a quote line from a library appliance. High-draw items default off backup (PRD QTE-05). */
export function itemFromAppliance(
  a: Appliance,
  quantity: number,
  hoursPerDay: number,
  onBackup = !a.highDraw,
): QuoteItem {
  return {
    name: a.name,
    watts: a.watts,
    quantity,
    hoursPerDay,
    dutyCycle: a.dutyCycle,
    surge: a.surge,
    highDraw: a.highDraw,
    onBackup,
  };
}

/** Typical hours per day, so the customer only changes what's different. Anything not listed defaults to 5. */
export const DEFAULT_HOURS: Record<string, number> = {
  "led-bulb": 6,
  "wifi-router": 24,
  "cctv-kit": 24,
  refrigerator: 24,
  "chest-freezer": 24,
  "led-security-light": 12,
  "standing-fan": 8,
  "ceiling-fan": 8,
  "ac-1hp": 6,
  "ac-1-5hp": 6,
  laptop: 6,
  "desktop-computer": 6,
  "phone-charger": 3,
  "water-pump-half-hp": 1,
};
