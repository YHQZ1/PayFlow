import express from "express";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "payment-service" });
});

app.use("/payments", paymentRoutes);

export default app;
