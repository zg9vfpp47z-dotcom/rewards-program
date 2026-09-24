import { RewardCalculation, RewardConfig, Tier } from "./types";

export class RewardsEngine {
  calculate(activityPoints: number, totalPoints: number, config: RewardConfig): RewardCalculation {
    const tier = this.resolveTier(totalPoints, config.tiers);
    const rewardAmount = Number((activityPoints * config.baseRewardRate * tier.multiplier).toFixed(4));

    return {
      tier: tier.name,
      multiplier: tier.multiplier,
      rewardAmount,
    };
  }

  private resolveTier(points: number, tiers: Tier[]): Tier {
    const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
    return sorted.find((tier) => points >= tier.minPoints) ?? sorted[sorted.length - 1];
  }
}
