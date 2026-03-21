import express from "express";
import tenantRoutes from "./routes/tenant.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "tenant-service" });
});

app.use("/tenants", tenantRoutes);

export default app;
