import { createTenant, getTenant } from "../services/tenant.service.js";

export const create = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const tenant = await createTenant({ name, email });
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
    const tenant = await getTenant(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: "tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
};
