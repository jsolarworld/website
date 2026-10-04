import { normalizeNgPhone } from "./phone";

/** A service booking from the website, validated. Pure so it can be tested without a browser (PRD SRV-03). */

export const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export const TIME_WINDOWS = ["Any time", "Morning (8am to 12pm)", "Afternoon (12pm to 4pm)", "Evening (4pm to 7pm)"] as const;

/** How far ahead a visit can be booked. */
export const MAX_DAYS_AHEAD = 180;

export interface BookingInput {
  serviceId: string;
  name: string;
  /** Normalised +234… */
  phone: string;
  email: string | null;
  state: string;
  area: string;
  address: string;
  /** Noon in Lagos on the chosen day, or null for "as soon as possible". */
  preferredDate: Date | null;
  timeWindow: string | null;
  notes: string | null;
}

interface FormLike {
  get(name: string): FormDataEntryValue | null;
}

/** Today's date in Lagos as YYYY-MM-DD, for the date picker's minimum and for checking the date. */
export const lagosToday = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(now);

/** The days the date picker allows: today in Lagos up to MAX_DAYS_AHEAD. */
export const bookingDateRange = (now = new Date()) => ({
  min: lagosToday(now),
  max: lagosToday(new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000)),
});

export function parseBooking(
  form: FormLike,
  serviceIds: string[],
  now = new Date(),
): { ok: true; data: BookingInput } | { ok: false; errors: Record<string, string> } {
  const text = (key: string, max: number) => {
    const v = form.get(key);
    return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
  };
  const errors: Record<string, string> = {};

  const serviceId = text("serviceId", 40);
  if (!serviceIds.includes(serviceId)) errors.serviceId = "Choose a service";
  const name = text("name", 80);
  if (name.length < 2) errors.name = "Enter your name";
  const phone = normalizeNgPhone(text("phone", 30));
  if (!phone) errors.phone = "Enter a Nigerian phone number, e.g. 0803 123 4567";
  const email = text("email", 120) || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "That email address doesn't look right";
  const state = text("state", 40);
  if (!(NG_STATES as readonly string[]).includes(state)) errors.state = "Choose your state";
  const area = text("area", 80);
  if (area.length < 2) errors.area = "Enter your area, e.g. Ojo or Lekki";
  const address = text("address", 200);
  if (address.length < 5) errors.address = "Enter the address where the work is";

  let preferredDate: Date | null = null;
  const day = text("preferredDate", 10);
  if (day) {
    const { min: today, max: latest } = bookingDateRange(now);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) errors.preferredDate = "Choose a date";
    else if (day < today) errors.preferredDate = "Choose today or a later date";
    else if (day > latest) errors.preferredDate = `Choose a date within the next ${MAX_DAYS_AHEAD} days`;
    else preferredDate = new Date(`${day}T12:00:00+01:00`);
  }
  const window = text("timeWindow", 40);
  if (window && !(TIME_WINDOWS as readonly string[]).includes(window)) errors.timeWindow = "Choose a time";

  const notesRaw = form.get("notes");
  const notes = typeof notesRaw === "string" ? notesRaw.trim().slice(0, 1000) || null : null;

  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  return { ok: true, data: { serviceId, name, phone, email, state, area, address, preferredDate, timeWindow: window || null, notes } };
}
