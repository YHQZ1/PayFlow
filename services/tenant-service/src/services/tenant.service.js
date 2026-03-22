import { db } from "../db/index.js";
import { tenants, apiKeys, webhookEndpoints } from "../db/schema.js";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { NotFoundError, ConflictError } from "../errors.js";

// ─── Health ───────────────────────────────────────────────────

export const checkHealth = async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: "ok",
      service: "tenant-service",
      timestamp: new Date().toISOString(),
      checks: { database: "ok" },
    };
  } catch {
    return {
      status: "degraded",
      service: "tenant-service",
      timestamp: new Date().toISOString(),
      checks: { database: "error" },
    };
  }
};

// ─── Tenants ──────────────────────────────────────────────────

export const createTenant = async ({ name, email }) => {
  try {
    const [tenant] = await db
      .insert(tenants)
      .values({ name, email })
      .returning();
    return tenant;
  } catch (err) {
    if (err.cause?.code === "23505" || err.message?.includes("unique")) {
      throw new ConflictError("email already registered");
    }
    throw err;
  }
};

export const listTenants = async ({ limit = 20, offset = 0 } = {}) => {
  return db
    .select()
    .from(tenants)
    .orderBy(desc(tenants.createdAt))
    .limit(limit)
    .offset(offset);
};

export const getTenant = async (id) => {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
  return tenant || null;
};

export const updateTenant = async (id, fields) => {
  const [tenant] = await db
    .update(tenants)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();
  if (!tenant) throw new NotFoundError("tenant");
  return tenant;
};

export const deleteTenant = async (id) => {
  const [tenant] = await db
    .delete(tenants)
    .where(eq(tenants.id, id))
    .returning();
  if (!tenant) throw new NotFoundError("tenant");
  return tenant;
};

// ─── API Keys ─────────────────────────────────────────────────

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
    .where(eq(apiKeys.tenantId, tenantId))
    .orderBy(desc(apiKeys.createdAt));
};

export const revokeApiKey = async (tenantId, keyId) => {
  const [key] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
    .returning();
  return key || null;
};

export const validateApiKey = async (rawKey) => {
  const keyPrefix = rawKey.slice(0, 14);
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPrefix, keyPrefix), isNull(apiKeys.revokedAt)));
  for (const key of candidates) {
    const match = await bcrypt.compare(rawKey, key.keyHash);
    if (match) return { tenantId: key.tenantId };
  }
  return null;
};

// ─── Webhooks ─────────────────────────────────────────────────

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
    .where(eq(webhookEndpoints.tenantId, tenantId))
    .orderBy(desc(webhookEndpoints.createdAt));
};

export const removeWebhook = async (tenantId, webhookId) => {
  const [webhook] = await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.tenantId, tenantId),
      ),
    )
    .returning();
  return webhook || null;
};
