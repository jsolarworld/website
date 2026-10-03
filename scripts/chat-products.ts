/**
 * Products the owner listed in the WhatsApp chat (the gitignored `chat/` export of 3 October 2026), read by
 * `scripts/import-chat-products.ts`. Names, prices and ratings are the owner's captions; a rating that only
 * appears on a label in his own photo is used when the caption is silent. Everything else is left empty for
 * staff to fill in on the dashboard.
 *
 * To add more: append an entry, put its files in `chat/`, run `pnpm import:chat`, then `pnpm import:chat --apply`.
 */

export interface ChatMedia {
  /** File name inside `chat/`. A `.mp4` is uploaded as a video. */
  file: string;
  /** What it shows: the alt text of a photo, the caption of a video. */
  alt: string;
  /** Keep only this part of a photo, in pixels: [left, top, width, height]. Cuts away a screenshot's borders, a passer-by, or another shop's phone number. */
  crop?: [number, number, number, number];
}

export interface ChatProduct {
  name: string;
  /** Category slug. */
  category: string;
  brand: string | null;
  /** Whole naira, or null when the owner gave no price ("Price on request"). */
  priceNgn: number | null;
  /** Values for the category's spec fields. */
  specs?: Record<string, string | number>;
  media: ChatMedia[];
  /** DRAFT (hidden) for items read off a label that the owner has not named or priced himself. Default: PUBLISHED. */
  status?: "DRAFT" | "PUBLISHED";
  /** Something a person should check; printed when the import runs. */
  note?: string;
}

/** Brand names as printed on the products. The first list of brands was typed from memory and had these two wrong. */
export const BRAND_RENAMES = [
  { fromSlug: "lvstupsun", name: "LVTOPSUN" },
  { fromSlug: "ecolione", name: "Ecolion" },
];

const HYBRID = "Hybrid";
const ALL_IN_ONE = "All-in-one";

export const CHAT_PRODUCTS: ChatProduct[] = [
  // ─── Inverters ─────────────────────────────────────────────────────────────
  {
    name: "Felicity 6kVA Hybrid Inverter 48V (IVEM6048-II)",
    category: "inverters",
    brand: "Felicity",
    priceNgn: 550_000,
    specs: { ratedKva: 6, ratedContinuousW: 6000, systemVoltage: 48, type: HYBRID },
    media: [
      { file: "IMG-20261002-WA0005.jpg", alt: "Felicity 6kVA hybrid inverter in its carton" },
      { file: "IMG-20260921-WA0095.jpg", alt: "Rating label of the Felicity IVEM6048-II inverter: 6000VA / 6000W, 48V" },
    ],
  },
  {
    name: "Felicity 10kVA Hybrid Inverter 48V",
    category: "inverters",
    brand: "Felicity",
    priceNgn: 800_000,
    specs: { ratedKva: 10, systemVoltage: 48, type: HYBRID },
    media: [{ file: "IMG-20261002-WA0052.jpg", alt: "Felicity 10kVA hybrid inverter with its user guide" }],
  },
  {
    name: "Felicity IVGM 20kVA Three-Phase Inverter",
    category: "inverters",
    brand: "Felicity",
    priceNgn: 3_400_000,
    specs: { ratedKva: 20, type: "Three-phase" },
    media: [{ file: "IMG-20261002-WA0033.jpg", alt: "Felicity IVGM 20kVA three-phase inverter unpacked with its accessory boxes" }],
  },
  {
    name: "Yohako 1.5kVA Pure Sine Wave Inverter 24V",
    category: "inverters",
    brand: "Yohako",
    priceNgn: 250_000,
    specs: { ratedKva: 1.5, systemVoltage: 24, type: "Pure sine wave" },
    media: [{ file: "IMG-20261002-WA0032.jpg", alt: "Yohako 1.5kVA pure sine wave inverter beside its carton" }],
  },
  {
    name: "Deye 16kVA Inverter 48V",
    category: "inverters",
    brand: "Deye",
    priceNgn: 3_200_000,
    specs: { ratedKva: 16, systemVoltage: 48 },
    media: [{ file: "IMG-20261002-WA0045.jpg", alt: "Deye inverter, front view" }],
    note: "The owner's two Deye photos were swapped: the one he captioned 16kVA shows a wall sign reading SUN-20K, so it is on the 20kVA product and this one has the other photo.",
  },
  {
    name: "Deye 20kVA Three-Phase Hybrid Inverter",
    category: "inverters",
    brand: "Deye",
    priceNgn: 4_000_000,
    specs: { ratedKva: 20, type: "Three-phase hybrid" },
    media: [{ file: "IMG-20261002-WA0046.jpg", alt: "Deye SUN-20K three-phase hybrid inverter on a showroom wall" }],
  },
  {
    name: "Deye 30kVA Hybrid Inverter (High Voltage)",
    category: "inverters",
    brand: "Deye",
    priceNgn: 5_800_000,
    specs: { ratedKva: 30, type: "Hybrid, high voltage" },
    media: [{ file: "IMG-20261002-WA0047.jpg", alt: "Deye 30kVA high-voltage hybrid inverter, front view", crop: [0, 0, 720, 1262] }],
  },
  {
    name: "Deye 6kW Hybrid Inverter",
    category: "inverters",
    brand: "Deye",
    priceNgn: 550_000,
    specs: { type: HYBRID },
    media: [{ file: "IMG-20261002-WA0056.jpg", alt: "Deye 6kW hybrid inverter, front view", crop: [14, 159, 512, 641] }],
  },
  {
    name: "LVTOPSUN 4kW Hybrid Inverter",
    category: "inverters",
    brand: "LVTOPSUN",
    priceNgn: null,
    specs: { type: HYBRID },
    media: [{ file: "IMG-20261002-WA0057.jpg", alt: "LVTOPSUN LVTS-4KW-24V-HYD hybrid inverter" }],
    note: "No price given. The caption says 48V but the picture is the 24V model (LVTS-4KW-24V-HYD), so the voltage is left out of the name.",
  },
  {
    name: "LVTOPSUN 6kW Hybrid Inverter 48V",
    category: "inverters",
    brand: "LVTOPSUN",
    priceNgn: 500_000,
    specs: { ratedKva: 6, systemVoltage: 48, type: HYBRID },
    media: [{ file: "IMG-20261002-WA0059.jpg", alt: "LVTOPSUN LVTS-6KW-48V-HYD hybrid inverter" }],
  },
  {
    name: "LVTOPSUN 12kW Hybrid Inverter 48V",
    category: "inverters",
    brand: "LVTOPSUN",
    priceNgn: 1_000_000,
    specs: { ratedKva: 12, systemVoltage: 48, type: HYBRID },
    media: [{ file: "IMG-20261002-WA0060.jpg", alt: "LVTOPSUN LVTS-12KW-48V-HYD hybrid inverter" }],
  },
  {
    name: "LVTOPSUN 15kW Three-Phase Inverter",
    category: "inverters",
    brand: "LVTOPSUN",
    priceNgn: null,
    specs: { type: "Three-phase" },
    media: [{ file: "IMG-20261002-WA0036.jpg", alt: "LVTOPSUN 15kW three-phase inverter", crop: [0, 246, 678, 530] }],
    note: "No price given.",
  },

  // ─── Lithium batteries ─────────────────────────────────────────────────────
  {
    name: "Felicity TG2 10kWh Lithium Battery 51.2V",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 1_550_000,
    specs: { capacityKwh: 10, voltage: 51.2 },
    media: [{ file: "IMG-20261002-WA0006.jpg", alt: "Felicity TG2 10kWh lithium battery unpacked beside its crate" }],
  },
  {
    name: "Felicity TG2 15kWh Lithium Battery",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 2_000_000,
    specs: { capacityKwh: 15 },
    media: [{ file: "IMG-20261002-WA0007.jpg", alt: "Felicity TG2 15kWh standing lithium battery" }],
  },
  {
    name: "Felicity 15kWh Lithium Battery 48V (Old Model)",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 2_000_000,
    specs: { capacityKwh: 15, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0028.jpg", alt: "Front and back of the older Felicity 15kWh lithium battery", crop: [0, 100, 1080, 843] }],
  },
  {
    name: "Felicity FLA 5kWh Lithium Battery 24V",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 1_000_000,
    specs: { capacityKwh: 5, voltage: 24 },
    media: [{ file: "IMG-20261002-WA0014.jpg", alt: "Felicity FLA 5kWh 24V lithium battery with its display on" }],
  },
  {
    name: "Felicity FLA 5kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 1_050_000,
    specs: { capacityKwh: 5, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0015.jpg", alt: "Felicity FLA 5kWh 48V lithium battery in its carton" }],
  },
  {
    name: "Felicity 5kWh Lithium Battery 48V (Old Model)",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 1_000_000,
    specs: { capacityKwh: 5, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0054.jpg", alt: "Older Felicity 5kWh 48V lithium battery, front view", crop: [0, 96, 768, 984] }],
  },
  {
    name: "Felicity FLA TG2 17.5kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 2_100_000,
    specs: { capacityKwh: 17.5, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0027.jpg", alt: "Felicity FLA TG2 17.5kWh lithium battery in its crate" }],
  },
  {
    name: "Felicity 17.5kWh Standing Lithium Battery",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 2_400_000,
    specs: { capacityKwh: 17.5 },
    media: [{ file: "VID-20261002-WA0062.mp4", alt: "Video of the Felicity 17.5kWh standing lithium battery and its rating label" }],
  },
  {
    name: "Felicity 25kWh Lithium Battery",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: 4_000_000,
    specs: { capacityKwh: 25 },
    media: [{ file: "IMG-20261002-WA0053.jpg", alt: "Felicity 25kWh lithium battery on wheels" }],
  },
  {
    name: "Felicity HOPE1000 1kWh Lithium Battery",
    category: "lithium-batteries",
    brand: "Felicity",
    priceNgn: null,
    specs: { capacityKwh: 1, cells: "LiFePO4" },
    media: [
      { file: "IMG-20260921-WA0094.jpg", alt: "Felicity HOPE1000 standing on its carton" },
      { file: "IMG-20260921-WA0092.jpg", alt: "Rating label of the Felicity HOPE1000: 1kWh LiFePO4 battery, 250W", crop: [25, 0, 805, 1056] },
    ],
    note: "No price given.",
  },
  {
    name: "Pattern 15kWh LiFePO4 Lithium Battery",
    category: "lithium-batteries",
    brand: "Pattern",
    priceNgn: 1_700_000,
    specs: { capacityKwh: 15, cells: "LiFePO4" },
    media: [{ file: "IMG-20261002-WA0010.jpg", alt: "Pattern 15kWh LiFePO4 lithium battery on a pallet" }],
  },
  {
    name: "Cworth 16kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 2_300_000,
    specs: { capacityKwh: 16, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0020.jpg", alt: "Cworth Energy 16kWh lithium battery, the maker's promotional picture" }],
  },
  {
    name: "Cworth 3kWh Lithium Battery 24V",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 600_000,
    specs: { capacityKwh: 3, voltage: 24 },
    media: [{ file: "VID-20261002-WA0021.mp4", alt: "Video of the Cworth Energy 3kWh 24V lithium battery, its terminals and its rating label" }],
  },
  {
    name: "Cworth 7.5kWh Lithium Battery 24V",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 1_200_000,
    specs: { capacityKwh: 7.5, voltage: 24, capacityAh: 300 },
    media: [{ file: "VID-20261002-WA0022.mp4", alt: "Video of the Cworth Energy 7.5kWh 24V lithium battery, its terminals and its rating label" }],
  },
  {
    name: "Cworth 20kWh Lithium Battery 48V (Old Design)",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 3_000_000,
    specs: { capacityKwh: 20, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0023.jpg", alt: "Two Cworth Energy LBF-48400C 20kWh lithium batteries side by side" }],
  },
  {
    name: "Cworth 20kWh Lithium Battery 48V (New Design)",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 2_900_000,
    specs: { capacityKwh: 20, voltage: 48 },
    media: [{ file: "VID-20261002-WA0024.mp4", alt: "Video walking round the new-design Cworth Energy 20kWh 48V lithium battery" }],
  },
  {
    name: "Cworth 15kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 1_900_000,
    specs: { capacityKwh: 15, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0055.jpg", alt: "Cworth Energy 15kWh 48V lithium battery on a pallet", crop: [0, 195, 810, 885] }],
  },
  {
    name: "Cworth 12V 100Ah Lithium Battery",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 240_000,
    specs: { capacityAh: 100, voltage: 12 },
    media: [],
    note: "No photo: the one sent with this caption (IMG-20261002-WA0029) shows a 12V 300Ah battery, not the 100Ah.",
  },
  {
    name: "Cworth 12V 200Ah Lithium Battery",
    category: "lithium-batteries",
    brand: "Cworth",
    priceNgn: 360_000,
    specs: { capacityAh: 200, voltage: 12, cells: "LiFePO4" },
    media: [{ file: "IMG-20261002-WA0030.jpg", alt: "Cworth Energy 12V 200Ah LiFePO4 battery on its carton", crop: [0, 100, 676, 980] }],
  },
  {
    name: "Ecolion 5kWh Lithium Battery",
    category: "lithium-batteries",
    brand: "Ecolion",
    priceNgn: 900_000,
    specs: { capacityKwh: 5, cells: "LiFePO4" },
    media: [{ file: "IMG-20261002-WA0034.jpg", alt: "Ecolion 5kWh LiFePO4 battery, front view" }],
    note: "The caption says 48V but the label in the photo reads 25.6V 195Ah, so the voltage is left out.",
  },
  {
    name: "Ecolion 7.68kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Ecolion",
    priceNgn: null,
    specs: { capacityKwh: 7.68, voltage: 48, capacityAh: 150, cells: "LiFePO4" },
    media: [
      { file: "IMG-20260921-WA0067.jpg", alt: "Ecolion 7.68kWh 51.2V 150Ah LiFePO4 battery, front view", crop: [38, 171, 464, 618] },
      { file: "IMG-20261002-WA0049.jpg", alt: "Ecolion 7.68kWh lithium battery in its crate" },
    ],
    note: "No price given.",
  },
  {
    name: "Ecolion 16kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Ecolion",
    priceNgn: null,
    specs: { capacityKwh: 16, voltage: 48, capacityAh: 314, cells: "LiFePO4" },
    media: [{ file: "IMG-20261002-WA0050.jpg", alt: "Ecolion 16kWh 51.2V 314Ah LiFePO4 battery on wheels" }],
    note: "No price given.",
  },
  {
    name: "Deye 16kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Deye",
    priceNgn: 2_700_000,
    specs: { capacityKwh: 16, voltage: 48 },
    media: [{ file: "IMG-20261002-WA0044.jpg", alt: "Deye 16kWh lithium battery on wheels", crop: [0, 316, 540, 539] }],
  },
  {
    name: "Deye 5kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "Deye",
    priceNgn: 950_000,
    specs: { capacityKwh: 5, voltage: 48 },
    media: [
      { file: "IMG-20261002-WA0051.jpg", alt: "Deye 5kWh 48V lithium battery" },
      { file: "VID-20261002-WA0088.mp4", alt: "Video of the Deye 5kWh 48V lithium battery being unpacked" },
    ],
    note: "Two prices were sent for this battery on the same day: 1,000,000 with the photo, then 950,000 with the video. The later one is used.",
  },
  {
    name: "Deye 60kWh Lithium Battery (High Voltage)",
    category: "lithium-batteries",
    brand: "Deye",
    priceNgn: 16_500_000,
    specs: { capacityKwh: 60 },
    media: [{ file: "IMG-20261002-WA0048.jpg", alt: "Deye 60kWh high-voltage lithium battery rack" }],
  },
  {
    name: "LVTOPSUN G3 16kWh Lithium Battery 48V",
    category: "lithium-batteries",
    brand: "LVTOPSUN",
    priceNgn: 2_100_000,
    specs: { capacityKwh: 16.07, voltage: 48, capacityAh: 314, cells: "LiFePO4" },
    media: [
      { file: "IMG-20261002-WA0061.jpg", alt: "LVTOPSUN G3 51.2V 314Ah 16.07kWh LiFePO4 power wall", crop: [244, 47, 593, 979] },
      { file: "VID-20260919-WA0053.mp4", alt: "Video of LVTOPSUN G3 (LVTS-512314) battery cartons in our store" },
    ],
    note: 'The "Lvtopsun 15kwh" video of 18 September shows cartons marked LVTS-512314 G3, which is this 16kWh battery, so it is attached here and not listed twice.',
  },
  {
    name: "LVTOPSUN 32kWh Lithium Battery 51.2V",
    category: "lithium-batteries",
    brand: "LVTOPSUN",
    priceNgn: null,
    specs: { capacityKwh: 32, voltage: 51.2, capacityAh: 628, cells: "LiFePO4" },
    media: [{ file: "IMG-20261002-WA0039.jpg", alt: "LVTOPSUN 51.2V 32kWh lithium iron phosphate battery leaflet" }],
    note: "No price given.",
  },
  {
    name: "LVTOPSUN 2.56kWh Lithium Battery 25.6V with Wi-Fi",
    category: "lithium-batteries",
    brand: "LVTOPSUN",
    priceNgn: null,
    specs: { capacityKwh: 2.56, voltage: 25.6, capacityAh: 100, cells: "LiFePO4" },
    media: [{ file: "IMG-20261002-WA0038.jpg", alt: "LVTOPSUN LVTS-256100 25.6V 100Ah 2.56kWh LiFePO4 power wall with Wi-Fi", crop: [249, 57, 492, 633] }],
    note: "No price given.",
  },
  {
    name: "Taico T-Series 20kWh Lithium Battery",
    category: "lithium-batteries",
    brand: "Taico",
    priceNgn: 3_100_000,
    specs: { capacityKwh: 20 },
    media: [{ file: "IMG-20261002-WA0064.jpg", alt: "Taico T-Series 20kWh lithium battery on a pallet" }],
  },
  {
    name: "Taico 5kWh Lithium Battery 24V",
    category: "lithium-batteries",
    brand: "Taico",
    priceNgn: 1_050_000,
    specs: { capacityKwh: 5, voltage: 24 },
    media: [{ file: "IMG-20261002-WA0065.jpg", alt: "Taico 5kWh 24V wall-mounted lithium battery in its carton with cables", crop: [8, 0, 608, 1080] }],
  },
  {
    name: "Taico 10kWh Lithium Battery",
    category: "lithium-batteries",
    brand: "Taico",
    priceNgn: 1_650_000,
    specs: { capacityKwh: 10 },
    media: [{ file: "IMG-20261002-WA0066.jpg", alt: "Taico 10kWh lithium battery, front view" }],
  },

  // ─── Inverter and battery sets (all-in-one units and matched sets) ──────────
  {
    name: "Felicity All-in-One 8kVA Inverter with 10kWh Lithium Battery",
    category: "inverter-and-battery-sets",
    brand: "Felicity",
    priceNgn: 2_500_000,
    specs: { ratedKva: 8, batteryKwh: 10 },
    media: [{ file: "IMG-20260921-WA0100.jpg", alt: "Felicity all-in-one system: 8kVA inverter stacked on a 10kWh lithium battery", crop: [0, 0, 730, 973] }],
  },
  {
    name: "Cworth All-in-One 10kVA Inverter with 16kWh Lithium Battery",
    category: "inverter-and-battery-sets",
    brand: "Cworth",
    priceNgn: 3_000_000,
    specs: { ratedKva: 10, batteryKwh: 16 },
    media: [{ file: "VID-20261002-WA0019.mp4", alt: "Video of the Cworth Energy all-in-one system: 10kVA inverter with a 16kWh lithium battery" }],
  },
  {
    name: "Felicity 30kVA Inverter with 60kWh Lithium Battery",
    category: "inverter-and-battery-sets",
    brand: "Felicity",
    priceNgn: 19_000_000,
    specs: { ratedKva: 30, batteryKwh: 60 },
    media: [{ file: "IMG-20261002-WA0016.jpg", alt: "Felicity 30kVA inverter beside a 60kWh lithium battery rack" }],
  },

  // ─── Solar panels ──────────────────────────────────────────────────────────
  {
    name: "Jinko 780W Bifacial Mono Solar Panel",
    category: "solar-panels",
    brand: "Jinko",
    priceNgn: 160_000,
    specs: { watts: 780, type: "Bifacial monocrystalline" },
    media: [{ file: "IMG-20261002-WA0001.jpg", alt: "Front and back of the Jinko 780W bifacial mono solar panel" }],
  },
  {
    name: "Canadian Solar 650W Mono Solar Panel",
    category: "solar-panels",
    brand: "Canadian Solar",
    priceNgn: 120_000,
    specs: { watts: 650, type: "Monocrystalline" },
    media: [
      { file: "IMG-20261002-WA0004.jpg", alt: "Front of the Canadian Solar 650W mono solar panel", crop: [110, 0, 510, 1080] },
      { file: "IMG-20261002-WA0003.jpg", alt: "Back of the Canadian Solar 650W mono solar panel, with its cables", crop: [100, 0, 540, 1080] },
    ],
  },

  // ─── Solar street lights ───────────────────────────────────────────────────
  {
    name: "Felicity D2 80W All-in-One Solar Street Light",
    category: "solar-street-lights",
    brand: "Felicity",
    priceNgn: null,
    specs: { watts: 80, type: ALL_IN_ONE },
    media: [{ file: "VID-20260919-WA0039.mp4", alt: "Video of Felicity D2 80W all-in-one solar street light cartons in our store" }],
    note: "No price given.",
  },
  {
    name: "Felicity P2 60W All-in-One Solar Street Light",
    category: "solar-street-lights",
    brand: "Felicity",
    priceNgn: 150_000,
    specs: { watts: 60, type: ALL_IN_ONE },
    media: [{ file: "IMG-20261002-WA0009.jpg", alt: "Two Felicity P2 60W all-in-one solar street lights switched on in their carton" }],
  },
  {
    name: "Wakatek 100W All-in-One Solar Street Light (12 Eyes)",
    category: "solar-street-lights",
    brand: "Wakatek",
    priceNgn: 190_000,
    specs: { watts: 100, type: ALL_IN_ONE },
    media: [{ file: "IMG-20261002-WA0008.jpg", alt: "Wakatek 100W all-in-one solar street light with 12 lamp heads" }],
  },
  {
    name: "Wakatek 60W All-in-One Solar Street Light (8 Eyes)",
    category: "solar-street-lights",
    brand: "Wakatek",
    priceNgn: 170_000,
    specs: { watts: 60, type: ALL_IN_ONE },
    media: [{ file: "IMG-20261002-WA0018.jpg", alt: "Wakatek 60W all-in-one solar street light with 8 lamp heads" }],
  },
  {
    name: "Putian All-in-One Solar Street Light (20 Eyes)",
    category: "solar-street-lights",
    brand: "Putian",
    priceNgn: 280_000,
    specs: { type: ALL_IN_ONE },
    media: [{ file: "IMG-20261002-WA0011.jpg", alt: "Putian all-in-one solar street light with 20 lamp heads" }],
  },
  {
    name: "Putian 100W All-in-One Solar Street Light",
    category: "solar-street-lights",
    brand: "Putian",
    priceNgn: 130_000,
    specs: { watts: 100, type: ALL_IN_ONE },
    media: [{ file: "IMG-20261002-WA0012.jpg", alt: "Putian 100W all-in-one solar street light beside its carton" }],
  },
  {
    name: "Putian 300W All-in-One Solar Street Light",
    category: "solar-street-lights",
    brand: "Putian",
    priceNgn: 120_000,
    specs: { watts: 300, type: ALL_IN_ONE },
    media: [{ file: "IMG-20261002-WA0013.jpg", alt: "Putian 300W all-in-one solar street light with four LED panels" }],
  },
  {
    name: "All-in-One Solar Street Light (4 Eyes)",
    category: "solar-street-lights",
    brand: null,
    priceNgn: 25_000,
    specs: { type: ALL_IN_ONE },
    media: [{ file: "IMG-20261002-WA0031.jpg", alt: "Carton of the 4-eye all-in-one solar street light", crop: [0, 62, 542, 890] }],
  },

  // ─── Solar freezers ────────────────────────────────────────────────────────
  {
    name: "Bona 200L Solar DC Freezer (BD-200)",
    category: "solar-freezers",
    brand: "Bona",
    priceNgn: 850_000,
    specs: { capacityLitres: 200, power: "DC (solar)" },
    media: [
      { file: "IMG-20261002-WA0002.jpg", alt: "Bona BD-200 solar DC freezer with its door open, beside its carton" },
      { file: "VID-20261002-WA0017.mp4", alt: "Video of the solar freezer running from a battery" },
    ],
  },

  // ─── Accessories ───────────────────────────────────────────────────────────
  {
    name: "DAS Power Smart Solar Security Camera",
    category: "accessories",
    brand: "DAS Power",
    priceNgn: 60_000,
    specs: { type: "Solar security camera" },
    media: [
      { file: "IMG-20260921-WA0040.jpg", alt: "DAS Power smart solar security camera with its carton and fittings" },
      { file: "IMG-20260921-WA0030.jpg", alt: "DAS Power smart solar security camera mounted on a wall" },
    ],
    note: 'The price comes from a caption that only says "60k".',
  },

  // ─── Read off a label only: hidden drafts until the owner names and prices them ─
  {
    name: "Sako 2.56kWh Lithium Battery 25.6V",
    category: "lithium-batteries",
    brand: "Sako",
    priceNgn: null,
    status: "DRAFT",
    specs: { capacityKwh: 2.56, voltage: 25.6, capacityAh: 100 },
    media: [{ file: "IMG-20260921-WA0096.jpg", alt: "Stack of Sako Li-Sun 25.6V 2.56kWh lithium battery cartons" }],
  },
  {
    name: "Ecolion 9kWh Lithium Battery 25.6V",
    category: "lithium-batteries",
    brand: "Ecolion",
    priceNgn: null,
    status: "DRAFT",
    specs: { capacityKwh: 9, voltage: 25.6, capacityAh: 352, cells: "LiFePO4" },
    media: [{ file: "IMG-20260921-WA0058.jpg", alt: "Ecolion 9kWh 25.6V 352Ah LiFePO4 battery in its crate" }],
  },
  {
    name: "Minghong Energy 7.68kWh Power Wall Lithium Battery 25.6V",
    category: "lithium-batteries",
    brand: "Minghong Energy",
    priceNgn: null,
    status: "DRAFT",
    specs: { capacityKwh: 7.68, voltage: 25.6, capacityAh: 300, cells: "LiFePO4" },
    media: [{ file: "IMG-20260921-WA0049.jpg", alt: "Minghong Energy Power Wall 25.6V 300Ah 7.68kWh LiFePO4 battery in its crate" }],
  },
  {
    name: "Hamtem 10kWh Lithium Battery 51.2V",
    category: "lithium-batteries",
    brand: "Hamtem",
    priceNgn: null,
    status: "DRAFT",
    specs: { capacityKwh: 10, voltage: 51.2, cells: "LiFePO4" },
    media: [{ file: "IMG-20260921-WA0062.jpg", alt: "Hamtem 51.2V 10kWh LiFePO4 battery, front view" }],
  },
];
