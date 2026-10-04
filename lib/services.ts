import { db } from "./db";

/** Services shown on the website, in the order staff set. Hidden ones are switched on at /admin/bookings. */
export const getServices = () => db.service.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });

export const getService = (slug: string) => db.service.findFirst({ where: { slug, published: true } });
