import * as fraudService from "../services/fraud.service.js";

export const health = async (req, res) => {
  const result = await fraudService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

export const getRisk = async (req, res, next) => {
  try {
    const result = await fraudService.getRiskScore(req.params.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const resetRisk = async (req, res, next) => {
  try {
    await fraudService.resetRiskCounters(req.params.tenantId);
    res.json({
      message: "fraud counters reset",
      tenantId: req.params.tenantId,
    });
  } catch (err) {
    next(err);
  }
};
