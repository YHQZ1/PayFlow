import * as ledgerService from "../services/ledger.service.js";

export const health = async (req, res) => {
  const result = await ledgerService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

export const getBalance = async (req, res, next) => {
  try {
    const balance = await ledgerService.getBalance(req.params.tenantId);
    res.json(balance);
  } catch (err) {
    next(err);
  }
};

export const getJournal = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const result = await ledgerService.getJournal(req.params.tenantId, {
      limit,
      offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getJournalByPayment = async (req, res, next) => {
  try {
    const entries = await ledgerService.getJournalByPayment(
      req.params.tenantId,
      req.params.paymentId,
    );
    res.json(entries);
  } catch (err) {
    next(err);
  }
};
