import StrategyRepository from './db/strategy-repository';

/**
 * Activation Time Manager
 * Handles periodic saving of strategy activation times to prevent data loss
 */
export class ActivationTimeManager {
  private static instance: ActivationTimeManager | null = null;
  private saveInterval: NodeJS.Timeout | null = null;
  private strategiesMap: Map<string, { activatedAt: number | null; totalActiveTime: number; userEmail: string }> = new Map();

  private constructor() {}

  static getInstance(): ActivationTimeManager {
    if (!ActivationTimeManager.instance) {
      ActivationTimeManager.instance = new ActivationTimeManager();
    }
    return ActivationTimeManager.instance;
  }

  /**
   * Register a strategy for periodic time tracking
   */
  registerStrategy(strategyName: string, timeframe: string, activatedAt: number | null, totalActiveTime: number, userEmail: string): void {
    const key = `${strategyName}:${timeframe}`;
    this.strategiesMap.set(key, { activatedAt, totalActiveTime, userEmail });
  }

  /**
   * Update strategy activation time
   */
  updateStrategyTime(strategyName: string, timeframe: string, activatedAt: number | null, totalActiveTime: number): void {
    const key = `${strategyName}:${timeframe}`;
    const existing = this.strategiesMap.get(key);
    if (existing) {
      existing.activatedAt = activatedAt;
      existing.totalActiveTime = totalActiveTime;
    }
  }

  /**
   * Start periodic save system (every 5 minutes)
   */
  startPeriodicSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    this.saveInterval = setInterval(async () => {
      await this.saveActiveStrategiesTimes();
    }, 300000); // 5 minutes

    console.log('🔄 ActivationTimeManager: Started periodic save system (every 5 minutes)');
  }

  /**
   * Stop periodic save system
   */
  stopPeriodicSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
      console.log('⏹️ ActivationTimeManager: Stopped periodic save system');
    }
  }

  /**
   * Save activation times for all active strategies
   */
  private async saveActiveStrategiesTimes(): Promise<void> {
    const activeStrategies = Array.from(this.strategiesMap.entries()).filter(
      ([_, data]) => data.activatedAt !== null
    );

    if (activeStrategies.length === 0) {
      return;
    }

    console.log(`💾 ActivationTimeManager: Periodic save - updating ${activeStrategies.length} active strategies...`);

    for (const [key, data] of activeStrategies) {
      try {
        const [strategyName, timeframe] = key.split(':');
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - data.activatedAt!) / 1000);
        const totalTime = data.totalActiveTime + elapsedSeconds;

        // Update database
        await StrategyRepository.updateStrategyStatusWithTime(
          strategyName,
          true,
          data.activatedAt,
          totalTime,
          timeframe
        );

        // Update local state
        data.totalActiveTime = totalTime;
        data.activatedAt = currentTime; // Reset to prevent double counting

        console.log(`✅ Periodic save: ${strategyName} [${timeframe}] - Total: ${Math.floor(totalTime / 60)}m`);
      } catch (error) {
        console.error(`❌ Periodic save failed for ${key}:`, error);
      }
    }
  }

  /**
   * Save all active strategies one final time (for shutdown)
   */
  async saveAllActiveStrategies(): Promise<void> {
    console.log('🧹 ActivationTimeManager: Final save before shutdown...');
    await this.saveActiveStrategiesTimes();
    console.log('✅ ActivationTimeManager: Final save completed');
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    this.stopPeriodicSave();
    await this.saveAllActiveStrategies();
  }
}
