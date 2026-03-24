import cron from "node-cron";
import { runReconciliation } from "../services/reconciliation.service.js";
import { logger } from "../logger.js";

// Run daily at 1 AM
cron.schedule("0 1 * * *", async () => {
  logger.info("scheduled reconciliation run started");

  try {
    const tenants = await fetchAllTenants(); // Fetch from tenant service
    for (const tenant of tenants) {
      await runReconciliation(tenant.id);
    }
    logger.info("scheduled reconciliation run completed");
  } catch (err) {
    logger.error({ err }, "scheduled reconciliation run failed");
  }
});
