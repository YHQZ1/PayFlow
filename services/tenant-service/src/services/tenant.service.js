import { db } from "../db/index.js";
import { tenants } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const createTenant = async ({ name, email }) => {
  const [tenant] = await db.insert(tenants).values({ name, email }).returning();
  return tenant;
};

export const getTenant = async (id) => {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
  return tenant || null;
};
