import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await prisma.$connect();
    await redis.ping();
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT} (docs: /docs)`));
  } catch (e) {
    console.error("Startup error", e);
    process.exit(1);
  }
}

start();