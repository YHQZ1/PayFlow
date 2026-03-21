import * as tenantService from "../services/tenant.service.js";

// ─── Tenants ────────────────────────────────────────────────

export const create = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }
    const tenant = await tenantService.createTenant({ name, email });
    res.status(201).json(tenant);
  } catch (error) {
    if (
      error.message?.includes("unique constraint") ||
      error.cause?.code === "23505"
    ) {
      return res.status(409).json({ error: "email already exists" });
    }
    res.status(500).json({ error: "internal server error" });
  }
};

export const getById = async (req, res) => {
  try {
    const tenant = await tenantService.getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: "tenant not found" });
    res.json(tenant);
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

// ─── API Keys ────────────────────────────────────────────────

export const generateKey = async (req, res) => {
  try {
    const tenant = await tenantService.getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: "tenant not found" });

    const apiKey = await tenantService.generateApiKey(req.params.id);
    res.status(201).json({
      id: apiKey.id,
      rawKey: apiKey.rawKey,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      message: "Store this key safely — it will never be shown again",
    });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

export const listKeys = async (req, res) => {
  try {
    const keys = await tenantService.listApiKeys(req.params.id);
    res.json(keys);
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

export const revokeKey = async (req, res) => {
  try {
    const key = await tenantService.revokeApiKey(
      req.params.id,
      req.params.keyId,
    );
    if (!key) return res.status(404).json({ error: "key not found" });
    res.json({ message: "key revoked", key });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

export const validateKey = async (req, res) => {
  try {
    const { rawKey } = req.body;
    if (!rawKey) return res.status(400).json({ error: "rawKey is required" });

    const result = await tenantService.validateApiKey(rawKey);
    if (!result) return res.status(401).json({ error: "invalid key" });

    res.json(result);
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

// ─── Webhooks ────────────────────────────────────────────────

export const addWebhook = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });

    const tenant = await tenantService.getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: "tenant not found" });

    const webhook = await tenantService.addWebhook(req.params.id, url);
    res.status(201).json(webhook);
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

export const listWebhooks = async (req, res) => {
  try {
    const webhooks = await tenantService.listWebhooks(req.params.id);
    res.json(webhooks);
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

export const removeWebhook = async (req, res) => {
  try {
    const webhook = await tenantService.removeWebhook(
      req.params.id,
      req.params.webhookId,
    );
    if (!webhook) return res.status(404).json({ error: "webhook not found" });
    res.json({ message: "webhook removed" });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};
