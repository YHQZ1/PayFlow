import * as notificationService from "../services/notification.service.js";

export const health = async (req, res) => {
  const result = await notificationService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};
