import crypto from "crypto";
import { logger } from "../logger.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateSignature = (payload, secret) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return { timestamp, signature };
};

export const deliverWebhook = async (url, payload, secret, maxRetries = 5) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    const startTime = Date.now();
    try {
      const { timestamp, signature } = generateSignature(payload, secret);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PayFlow-Signature": signature,
          "X-PayFlow-Timestamp": timestamp.toString(),
          "User-Agent": "PayFlow-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        logger.info(
          { url, status: response.status, attempt: attempt + 1, duration },
          "webhook delivered",
        );
        return {
          success: true,
          status: response.status,
          attempt: attempt + 1,
          duration,
        };
      }

      logger.warn(
        { url, status: response.status, attempt: attempt + 1, duration },
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
