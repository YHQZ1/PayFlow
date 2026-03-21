import { createTenant, getTenant } from "../services/tenant.service.js";

export const create = (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }

  const tenant = createTenant({ name, email });
  res.status(201).json(tenant);
};

export const getById = (req, res) => {
  const tenant = getTenant(req.params.id);

  if (!tenant) {
    return res.status(404).json({ error: "tenant not found" });
  }

  res.json(tenant);
};
