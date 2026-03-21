import app from "./app.js";
import { connectProducer } from "./kafka/producer.js";
import "dotenv/config";

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectProducer();
  app.listen(PORT, () => {
    console.log(`payment-service running on port ${PORT}`);
  });
};

start();
