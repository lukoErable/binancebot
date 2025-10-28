/**
 * Periodic Activation Time Saver
 * Simple script to save strategy activation times every 5 minutes
 * Run this as a background process or integrate into your main application
 */

import StrategyRepository from './db/strategy-repository';

interface StrategyData {
  name: string;
  timeframe: string;
  activatedAt: number | null;
  totalActiveTime: number;
  userEmail: string;
}

class PeriodicActivationSaver {
  private interval: NodeJS.Timeout | null = null;
  private strategies: Map<string, StrategyData> = new Map();

  /**
   * Register a strategy for periodic saving
   */
  registerStrategy(name: string, timeframe: string, activatedAt: number | null, totalActiveTime: number, userEmail: string): void {
    const key = `${name}:${timeframe}`;
    this.strategies.set(key, { name, timeframe, activatedAt, totalActiveTime, userEmail });
  }

  /**
   * Update strategy data
   */
  updateStrategy(name: string, timeframe: string, activatedAt: number | null, totalActiveTime: number): void {
    const key = `${name}:${timeframe}`;
    const existing = this.strategies.get(key);
    if (existing) {
      existing.activatedAt = activatedAt;
      existing.totalActiveTime = totalActiveTime;
    }
  }

  /**
   * Start periodic saving (every 5 minutes)
   */
  start(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(async () => {
      await this.saveActiveStrategies();
    }, 300000); // 5 minutes

    console.log('🔄 PeriodicActivationSaver: Started (every 5 minutes)');
  }

  /**
   * Stop periodic saving
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('⏹️ PeriodicActivationSaver: Stopped');
    }
  }

  /**
   * Save all active strategies
   */
  private async saveActiveStrategies(): Promise<void> {
    const activeStrategies = Array.from(this.strategies.values()).filter(
      strategy => strategy.activatedAt !== null
    );

    if (activeStrategies.length === 0) {
      return;
    }

    console.log(`💾 PeriodicActivationSaver: Saving ${activeStrategies.length} active strategies...`);

    for (const strategy of activeStrategies) {
      try {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - strategy.activatedAt!) / 1000);
        const totalTime = strategy.totalActiveTime + elapsedSeconds;

        // Update database
        await StrategyRepository.updateStrategyStatusWithTime(
          strategy.name,
          true,
          strategy.activatedAt,
          totalTime,
          strategy.timeframe
        );

        // Update local data
        strategy.totalActiveTime = totalTime;
        strategy.activatedAt = currentTime; // Reset to prevent double counting

        console.log(`✅ Saved: ${strategy.name} [${strategy.timeframe}] - Total: ${Math.floor(totalTime / 60)}m`);
      } catch (error) {
        console.error(`❌ Failed to save ${strategy.name} [${strategy.timeframe}]:`, error);
      }
    }
  }

  /**
   * Final save before shutdown
   */
  async finalSave(): Promise<void> {
    console.log('🧹 PeriodicActivationSaver: Final save...');
    await this.saveActiveStrategies();
    console.log('✅ PeriodicActivationSaver: Final save completed');
  }
}

// Export singleton instance
export const periodicActivationSaver = new PeriodicActivationSaver();

// Auto-start if this module is imported
periodicActivationSaver.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, performing final save...');
  await periodicActivationSaver.finalSave();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, performing final save...');
  await periodicActivationSaver.finalSave();
  process.exit(0);
});
