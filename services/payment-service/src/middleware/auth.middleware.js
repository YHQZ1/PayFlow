import bcrypt from "bcrypt";
import "dotenv/config";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "missing api key" });
    }

    const rawKey = authHeader.split(" ")[1];

    const response = await fetch(
      `${process.env.TENANT_SERVICE_URL}/tenants/keys/validate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawKey }),
      },
    );

    if (!response.ok) {
      return res.status(401).json({ error: "invalid api key" });
    }

    const { tenantId } = await response.json();
    req.tenantId = tenantId;
    next();
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};
