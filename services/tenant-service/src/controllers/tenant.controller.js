import * as tenantService from "../services/tenant.service.js";
import { NotFoundError } from "../errors.js";

// ─── Health ───────────────────────────────────────────────────

export const health = async (req, res) => {
  const result = await tenantService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

// ─── Tenants ──────────────────────────────────────────────────

export const list = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const rows = await tenantService.listTenants({ limit, offset });
    res.json({ data: rows, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const tenant = await tenantService.createTenant(req.body);
    res.status(201).json(tenant);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenant(req.params.id);
    if (!tenant) return next(new NotFoundError("tenant"));
    res.json(tenant);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.id, req.body);
    res.json(tenant);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await tenantService.deleteTenant(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── API Keys ─────────────────────────────────────────────────

export const generateKey = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenant(req.params.id);
    if (!tenant) return next(new NotFoundError("tenant"));
    const apiKey = await tenantService.generateApiKey(req.params.id);
    res.status(201).json({
      id: apiKey.id,
      rawKey: apiKey.rawKey,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      message: "Store this key safely — it will never be shown again",
    });
  } catch (err) {
    next(err);
  }
};

export const listKeys = async (req, res, next) => {
  try {
    const keys = await tenantService.listApiKeys(req.params.id);
    res.json(keys);
  } catch (err) {
    next(err);
  }
};

export const revokeKey = async (req, res, next) => {
  try {
    const key = await tenantService.revokeApiKey(
      req.params.id,
      req.params.keyId,
    );
    if (!key) return next(new NotFoundError("api key"));
    res.json({ message: "key revoked", id: key.id, revokedAt: key.revokedAt });
  } catch (err) {
    next(err);
  }
};

export const validateKey = async (req, res, next) => {
  try {
    const result = await tenantService.validateApiKey(req.body.rawKey);

    if (!result) {
      return res.status(401).json({
        error: "invalid api key",
        code: "UNAUTHORIZED",
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Webhooks ─────────────────────────────────────────────────

export const addWebhook = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenant(req.params.id);
    if (!tenant) return next(new NotFoundError("tenant"));
    const webhook = await tenantService.addWebhook(req.params.id, req.body.url);
    res.status(201).json(webhook);
  } catch (err) {
    next(err);
  }
};

export const listWebhooks = async (req, res, next) => {
  try {
    const webhooks = await tenantService.listWebhooks(req.params.id);
    res.json(webhooks);
  } catch (err) {
    next(err);
  }
};

export const removeWebhook = async (req, res, next) => {
  try {
    const webhook = await tenantService.removeWebhook(
      req.params.id,
      req.params.webhookId,
    );
    if (!webhook) return next(new NotFoundError("webhook"));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
