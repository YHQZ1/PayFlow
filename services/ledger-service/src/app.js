import express from "express";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import ledgerRoutes from "./routes/ledger.routes.js";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use("/ledger", ledgerRoutes);

export default app;
