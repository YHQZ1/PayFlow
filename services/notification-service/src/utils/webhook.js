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
        console.log(`webhook delivered to ${url} — status ${response.status}`);
        return { success: true, status: response.status };
      }

      console.log(
        `webhook attempt ${attempt + 1} failed — status ${response.status}`,
      );
    } catch (error) {
      console.log(`webhook attempt ${attempt + 1} error — ${error.message}`);
    }

    attempt++;
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  console.log(`webhook failed after ${maxRetries} attempts — ${url}`);
  return { success: false };
};
