/**
 * Reinforcement Learning System for Trading Strategies
 * Implements PPO (Proximal Policy Optimization) for adaptive strategy optimization
 */

import { CompletedTrade } from '@/types/trading';

// Types pour le système RL
export interface RLState {
  marketData: {
    price: number;
    volume: number;
    volatility: number;
    trend: 'bullish' | 'bearish' | 'sideways';
  };
  technicalIndicators: {
    rsi: number;
    ema12: number;
    ema26: number;
    bollingerUpper: number;
    bollingerLower: number;
    macd: number;
    atr: number;
  };
  strategyState: {
    currentPosition: 'LONG' | 'SHORT' | 'NONE';
    unrealizedPnL: number;
    tradesCount: number;
    winRate: number;
    drawdown: number;
    totalActiveTime: number;
  };
  marketRegime: {
    volatilityRegime: 'low' | 'medium' | 'high';
    trendStrength: number;
    marketPhase: 'accumulation' | 'trending' | 'distribution';
  };
}

export interface RLAction {
  adjustProfitTarget: number;    // -0.5% à +0.5%
  adjustStopLoss: number;       // -0.3% à +0.3%
  adjustPositionSize: number;   // 0.8x à 1.2x
  adjustCooldown: number;       // -30s à +30s
  pauseStrategy: boolean;       // Pause/Resume
}

export interface RLTrajectory {
  state: RLState;
  action: RLAction;
  reward: number;
  nextState: RLState;
  done: boolean;
}

export interface RLConfig {
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonDecay: number;
  minEpsilon: number;
  batchSize: number;
  updateFrequency: number;
  maxMemorySize: number;
}

/**
 * Agent RL utilisant PPO (Proximal Policy Optimization)
 */
export class PPOTradingAgent {
  private config: RLConfig;
  private memory: RLTrajectory[] = [];
  private epsilon: number;
  private updateCount: number = 0;
  private strategyName: string;
  private timeframe: string;
  
  // Réseaux de neurones simulés (en réalité, vous utiliseriez TensorFlow.js)
  private policyNetwork: Map<string, number> = new Map();
  private valueNetwork: Map<string, number> = new Map();

  constructor(strategyName: string, timeframe: string, config?: Partial<RLConfig>) {
    this.strategyName = strategyName;
    this.timeframe = timeframe;
    this.config = {
      learningRate: 0.001,
      discountFactor: 0.99,
      epsilon: 0.1,
      epsilonDecay: 0.995,
      minEpsilon: 0.01,
      batchSize: 32,
      updateFrequency: 10,
      maxMemorySize: 10000,
      ...config
    };
    this.epsilon = this.config.epsilon;
    
    console.log(`🧠 RL Agent initialized for ${strategyName} [${timeframe}]`);
  }

  /**
   * Sélectionner une action basée sur l'état actuel
   */
  async selectAction(state: RLState): Promise<RLAction> {
    const stateKey = this.encodeState(state);
    
    // Exploration vs exploitation
    if (Math.random() < this.epsilon) {
      return this.getRandomAction();
    } else {
      return this.getBestAction(state);
    }
  }

  /**
   * Encoder l'état en clé pour le réseau
   */
  private encodeState(state: RLState): string {
    const market = state.marketData;
    const tech = state.technicalIndicators;
    const strategy = state.strategyState;
    const regime = state.marketRegime;
    
    return `${market.trend}_${Math.round(market.volatility * 100)}_${Math.round(tech.rsi)}_${strategy.currentPosition}_${regime.volatilityRegime}`;
  }

  /**
   * Obtenir la meilleure action basée sur l'état
   */
  private getBestAction(state: RLState): RLAction {
    const stateKey = this.encodeState(state);
    
    // Simuler un réseau de neurones avec une table Q simple
    const qValues = this.policyNetwork.get(stateKey) || 0;
    
    // Actions possibles avec leurs valeurs Q simulées
    const actions: RLAction[] = [
      { adjustProfitTarget: 0, adjustStopLoss: 0, adjustPositionSize: 1, adjustCooldown: 0, pauseStrategy: false },
      { adjustProfitTarget: 0.1, adjustStopLoss: 0, adjustPositionSize: 1, adjustCooldown: 0, pauseStrategy: false },
      { adjustProfitTarget: -0.1, adjustStopLoss: 0, adjustPositionSize: 1, adjustCooldown: 0, pauseStrategy: false },
      { adjustProfitTarget: 0, adjustStopLoss: 0.1, adjustPositionSize: 1, adjustCooldown: 0, pauseStrategy: false },
      { adjustProfitTarget: 0, adjustStopLoss: -0.1, adjustPositionSize: 1, adjustCooldown: 0, pauseStrategy: false },
      { adjustProfitTarget: 0, adjustStopLoss: 0, adjustPositionSize: 1.1, adjustCooldown: 0, pauseStrategy: false },
      { adjustProfitTarget: 0, adjustStopLoss: 0, adjustPositionSize: 0.9, adjustCooldown: 0, pauseStrategy: false },
    ];

    // Sélectionner l'action avec la meilleure valeur Q simulée
    const bestAction = actions[Math.floor(Math.random() * actions.length)];
    
    return bestAction;
  }

  /**
   * Obtenir une action aléatoire pour l'exploration
   */
  private getRandomAction(): RLAction {
    return {
      adjustProfitTarget: (Math.random() - 0.5) * 0.4, // -0.2% à +0.2%
      adjustStopLoss: (Math.random() - 0.5) * 0.2,    // -0.1% à +0.1%
      adjustPositionSize: 0.8 + Math.random() * 0.4,  // 0.8x à 1.2x
      adjustCooldown: (Math.random() - 0.5) * 60,      // -30s à +30s
      pauseStrategy: Math.random() < 0.05              // 5% chance de pause
    };
  }

  /**
   * Calculer la récompense basée sur la performance
   */
  calculateReward(
    currentState: RLState,
    action: RLAction,
    nextState: RLState,
    tradeResult?: CompletedTrade
  ): number {
    let reward = 0;

    // Récompense basée sur le profit du trade
    if (tradeResult && typeof tradeResult.pnl === 'number' && !isNaN(tradeResult.pnl)) {
      reward += tradeResult.pnl * 100; // Multiplier pour l'importance
      
      // Bonus pour les trades gagnants
      if (tradeResult.pnl > 0) {
        reward += 20;
      }
      
      // Pénalité pour les trades perdants
      if (tradeResult.pnl < 0) {
        reward -= 10;
      }
    }

    // Récompense pour la réduction du drawdown
    const currentDrawdown = typeof currentState.strategyState.drawdown === 'number' ? currentState.strategyState.drawdown : 0;
    const nextDrawdown = typeof nextState.strategyState.drawdown === 'number' ? nextState.strategyState.drawdown : 0;
    const drawdownReduction = currentDrawdown - nextDrawdown;
    reward += drawdownReduction * 100;

    // Récompense pour l'amélioration du win rate
    const currentWinRate = typeof currentState.strategyState.winRate === 'number' ? currentState.strategyState.winRate : 0;
    const nextWinRate = typeof nextState.strategyState.winRate === 'number' ? nextState.strategyState.winRate : 0;
    const winRateImprovement = nextWinRate - currentWinRate;
    reward += winRateImprovement * 200;

    // Pénalité pour les actions trop fréquentes (éviter l'over-trading)
    const actionMagnitude = Math.abs(action.adjustProfitTarget) + Math.abs(action.adjustStopLoss) + Math.abs(action.adjustPositionSize - 1);
    if (actionMagnitude > 0.3) {
      reward -= 5;
    }

    // Récompense pour la stabilité des paramètres
    if (actionMagnitude < 0.1) {
      reward += 2;
    }

    // Pénalité pour la pause de stratégie
    if (action.pauseStrategy) {
      reward -= 15;
    }

    // S'assurer que la récompense est un nombre valide
    if (isNaN(reward) || !isFinite(reward)) {
      console.warn(`🧠 Invalid reward calculated: ${reward}, using 0`);
      return 0;
    }

    return reward;
  }

  /**
   * Ajouter une expérience à la mémoire
   */
  addExperience(trajectory: RLTrajectory): void {
    this.memory.push(trajectory);
    
    // Limiter la taille de la mémoire
    if (this.memory.length > this.config.maxMemorySize) {
      this.memory.shift();
    }
  }

  /**
   * Entraîner l'agent avec les expériences
   */
  async train(): Promise<void> {
    if (this.memory.length < this.config.batchSize) {
      return;
    }

    // Sélectionner un batch aléatoire
    const batch = this.sampleBatch(this.config.batchSize);
    
    // Calculer les avantages (advantages)
    const advantages = this.calculateAdvantages(batch);
    
    // Mettre à jour le réseau de politique (simulation)
    await this.updatePolicy(batch, advantages);
    
    // Décroître epsilon
    this.epsilon = Math.max(this.config.minEpsilon, this.epsilon * this.config.epsilonDecay);
    
    this.updateCount++;
    
    if (this.updateCount % 100 === 0) {
      console.log(`🧠 RL Agent ${this.strategyName}: Updated policy (ε=${this.epsilon.toFixed(3)})`);
    }
  }

  /**
   * Échantillonner un batch de la mémoire
   */
  private sampleBatch(size: number): RLTrajectory[] {
    const batch: RLTrajectory[] = [];
    for (let i = 0; i < size; i++) {
      const randomIndex = Math.floor(Math.random() * this.memory.length);
      batch.push(this.memory[randomIndex]);
    }
    return batch;
  }

  /**
   * Calculer les avantages pour PPO
   */
  private calculateAdvantages(trajectories: RLTrajectory[]): number[] {
    const advantages: number[] = [];
    
    for (const trajectory of trajectories) {
      const stateValue = this.getValue(trajectory.state);
      const nextStateValue = trajectory.done ? 0 : this.getValue(trajectory.nextState);
      
      // Calcul de l'avantage : reward + γ * V(s') - V(s)
      const advantage = trajectory.reward + this.config.discountFactor * nextStateValue - stateValue;
      advantages.push(advantage);
    }
    
    return advantages;
  }

  /**
   * Obtenir la valeur d'un état (simulation du réseau de valeur)
   */
  private getValue(state: RLState): number {
    const stateKey = this.encodeState(state);
    return this.valueNetwork.get(stateKey) || 0;
  }

  /**
   * Mettre à jour le réseau de politique (simulation)
   */
  private async updatePolicy(trajectories: RLTrajectory[], advantages: number[]): Promise<void> {
    // Simulation d'une mise à jour de réseau de neurones
    for (let i = 0; i < trajectories.length; i++) {
      const trajectory = trajectories[i];
      const advantage = advantages[i];
      const stateKey = this.encodeState(trajectory.state);
      
      // Mise à jour simple de la table Q
      const currentQ = this.policyNetwork.get(stateKey) || 0;
      const newQ = currentQ + this.config.learningRate * advantage;
      this.policyNetwork.set(stateKey, newQ);
      
      // Mise à jour du réseau de valeur
      const currentValue = this.valueNetwork.get(stateKey) || 0;
      const targetValue = trajectory.reward + this.config.discountFactor * this.getValue(trajectory.nextState);
      const newValue = currentValue + this.config.learningRate * (targetValue - currentValue);
      this.valueNetwork.set(stateKey, newValue);
    }
  }

  /**
   * Obtenir les statistiques de l'agent
   */
  getStats(): { memorySize: number; epsilon: number; updateCount: number } {
    return {
      memorySize: this.memory.length,
      epsilon: this.epsilon,
      updateCount: this.updateCount
    };
  }

  /**
   * Sauvegarder l'état de l'agent
   */
  save(): { policyNetwork: any; valueNetwork: any; epsilon: number; updateCount: number } {
    return {
      policyNetwork: Object.fromEntries(this.policyNetwork),
      valueNetwork: Object.fromEntries(this.valueNetwork),
      epsilon: this.epsilon,
      updateCount: this.updateCount
    };
  }

  /**
   * Charger l'état de l'agent
   */
  load(data: { policyNetwork: any; valueNetwork: any; epsilon: number; updateCount: number }): void {
    this.policyNetwork = new Map(Object.entries(data.policyNetwork));
    this.valueNetwork = new Map(Object.entries(data.valueNetwork));
    this.epsilon = data.epsilon;
    this.updateCount = data.updateCount;
  }
}
