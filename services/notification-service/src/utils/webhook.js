import { logger } from "../logger.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const deliverWebhook = async (url, payload, maxRetries = 3) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        logger.info(
          { url, status: response.status, attempt: attempt + 1 },
          "webhook delivered",
        );
        return { success: true, status: response.status };
      }

      logger.warn(
        { url, status: response.status, attempt: attempt + 1 },
        "webhook attempt failed",
      );
    } catch (err) {
      logger.warn(
        { url, err: err.message, attempt: attempt + 1 },
        "webhook attempt errored",
      );
    }

    attempt++;
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      logger.info({ url, delay, nextAttempt: attempt + 1 }, "retrying webhook");
      await sleep(delay);
    }
  }

  logger.error({ url, maxRetries }, "webhook failed permanently");
  return { success: false };
};
