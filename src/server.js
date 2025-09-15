import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { cleanupService } from "./services/cleanup.service.js";

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await prisma.$connect();
    await redis.ping();
    
    // Start cleanup service for Redis data maintenance
    cleanupService.start();
    
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
      console.log("Cleanup service started for Redis data maintenance");
    });
  } catch (e) {
    console.error("Startup error", e);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  cleanupService.stop();
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  cleanupService.stop();
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

start();