import { db } from "../db/index.js";
import { tenants, apiKeys, webhookEndpoints } from "../db/schema.js";
import { eq, and, isNull, desc, sql, or, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { NotFoundError, ConflictError } from "../errors.js";

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

export const createTenant = async ({ name, email }) => {
  try {
    const [tenant] = await db
      .insert(tenants)
      .values({ name: name.trim(), email: email.toLowerCase().trim() })
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
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(tenants)
      .where(isNull(tenants.deletedAt))
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(tenants)
      .where(isNull(tenants.deletedAt)),
  ]);
  const totalCount = Number(total[0].count);
  return {
    data: rows,
    total: totalCount,
    limit,
    offset,
    hasMore: offset + limit < totalCount,
  };
};

export const getTenant = async (id) => {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)));
  return tenant || null;
};

export const updateTenant = async (id, fields) => {
  const [tenant] = await db
    .update(tenants)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
    .returning();
  if (!tenant) throw new NotFoundError("tenant");
  return tenant;
};

export const deleteTenant = async (id) => {
  const [tenant] = await db
    .update(tenants)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
    .returning();
  if (!tenant) throw new NotFoundError("tenant");
  return tenant;
};

export const generateApiKey = async (tenantId, expiresInDays = 365) => {
  const rawKey = `pk_live_${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 14);
  const keyHash = await bcrypt.hash(rawKey, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  const [apiKey] = await db
    .insert(apiKeys)
    .values({ tenantId, keyHash, keyPrefix, expiresAt })
    .returning();
  return { ...apiKey, rawKey };
};

export const listApiKeys = async (tenantId) => {
  return db
    .select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
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
  // Extract prefix from raw key (first 14 chars)
  const keyPrefix = rawKey.slice(0, 14);

  // Find all keys with matching prefix that are not revoked and not expired
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, keyPrefix),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
      ),
    );

  // Compare raw key with each candidate's bcrypt hash
  for (const key of candidates) {
    const match = await bcrypt.compare(rawKey, key.keyHash);
    if (match) {
      return { tenantId: key.tenantId };
    }
  }

  return null;
};

export const addWebhook = async (tenantId, url) => {
  const secret = crypto.randomBytes(32).toString("hex");
  const [webhook] = await db
    .insert(webhookEndpoints)
    .values({ tenantId, url, secret })
    .returning();
  return webhook;
};

export const listWebhooks = async (tenantId) => {
  return db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      active: webhookEndpoints.active,
      createdAt: webhookEndpoints.createdAt,
    })
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
