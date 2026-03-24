import express from "express";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import notificationRoutes from "./routes/notification.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use("/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
