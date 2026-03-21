import { db } from "../db/index.js";
import { tenants, apiKeys, webhookEndpoints } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

// ─── Tenants ────────────────────────────────────────────────

export const createTenant = async ({ name, email }) => {
  const [tenant] = await db.insert(tenants).values({ name, email }).returning();
  return tenant;
};

export const getTenant = async (id) => {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
  return tenant || null;
};

// ─── API Keys ────────────────────────────────────────────────

export const generateApiKey = async (tenantId) => {
  const rawKey = `pk_live_${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 14);
  const keyHash = await bcrypt.hash(rawKey, 10);

  const [apiKey] = await db
    .insert(apiKeys)
    .values({ tenantId, keyHash, keyPrefix })
    .returning();
  return { ...apiKey, rawKey };
};

export const listApiKeys = async (tenantId) => {
  return db
    .select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.tenantId, tenantId));
};

export const revokeApiKey = async (tenantId, keyId) => {
  const [key] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, keyId) && eq(apiKeys.tenantId, tenantId))
    .returning();
  return key || null;
};

// ─── Webhooks ────────────────────────────────────────────────

export const addWebhook = async (tenantId, url) => {
  const [webhook] = await db
    .insert(webhookEndpoints)
    .values({ tenantId, url })
    .returning();
  return webhook;
};

export const listWebhooks = async (tenantId) => {
  return db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.tenantId, tenantId));
};

export const removeWebhook = async (tenantId, webhookId) => {
  const [webhook] = await db
    .delete(webhookEndpoints)
    .where(
      eq(webhookEndpoints.id, webhookId) &&
        eq(webhookEndpoints.tenantId, tenantId),
    )
    .returning();
  return webhook || null;
};
