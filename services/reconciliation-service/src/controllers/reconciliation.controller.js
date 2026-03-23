import * as reconciliationService from "../services/reconciliation.service.js";
import { ValidationError } from "../errors.js";

export const health = async (req, res) => {
  const result = await reconciliationService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

export const run = async (req, res, next) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return next(new ValidationError("tenantId is required"));

    const result = await reconciliationService.runReconciliation(tenantId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const listRuns = async (req, res, next) => {
  try {
    const runs = reconciliationService.getRunHistory();
    res.json({ data: runs });
  } catch (err) {
    next(err);
  }
};

export const getMismatches = async (req, res, next) => {
  try {
    const mismatches = reconciliationService.getMismatchesByRun(
      req.params.runId,
    );
    if (!mismatches)
      return res
        .status(404)
        .json({ error: "run not found", code: "NOT_FOUND" });
    res.json({ data: mismatches });
  } catch (err) {
    next(err);
  }
};
