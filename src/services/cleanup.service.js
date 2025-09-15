import { cleanupExpiredCaptains } from "./geospatial.service.js";

/**
 * Cleanup service to maintain Redis data integrity
 */
export class CleanupService {
  constructor(intervalMinutes = 5) {
    this.intervalMinutes = intervalMinutes;
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) {
      console.log("Cleanup service is already running");
      return;
    }

    this.isRunning = true;
    console.log(`Starting cleanup service with ${this.intervalMinutes} minute intervals`);

    // Run cleanup immediately
    this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      console.log("Cleanup service is not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("Cleanup service stopped");
  }

  /**
   * Run the cleanup process
   */
  async runCleanup() {
    try {
      console.log("Running cleanup process...");
      const cleanedCount = await cleanupExpiredCaptains();
      console.log(`Cleanup completed. Removed ${cleanedCount} expired captains.`);
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      nextRun: this.isRunning ? new Date(Date.now() + this.intervalMinutes * 60 * 1000) : null
    };
  }
}

// Create singleton instance
export const cleanupService = new CleanupService(5); // 5 minute intervals
