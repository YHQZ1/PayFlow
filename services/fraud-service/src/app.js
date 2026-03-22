import express from "express";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import fraudRoutes from "./routes/fraud.routes.js";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use("/fraud", fraudRoutes);

export default app;
