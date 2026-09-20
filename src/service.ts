import crypto from "node:crypto";
import { RewardsEngine } from "./rewardsEngine";
import { AuditLog, DistributionRecord, RewardCalculation, RewardConfig, User } from "./types";

export type TokenDistributor = {
  sendReward(walletAddress: string, amount: number): Promise<{ txHash: string }>;
};

const now = () => new Date().toISOString();

const defaultConfig: RewardConfig = {
  baseRewardRate: 0.1,
  tiers: [
    { name: "Bronze", minPoints: 0, multiplier: 1 },
    { name: "Silver", minPoints: 100, multiplier: 1.25 },
    { name: "Gold", minPoints: 500, multiplier: 1.5 },
    { name: "Platinum", minPoints: 1000, multiplier: 2 },
  ],
};

export class InMemoryTokenDistributor implements TokenDistributor {
  async sendReward(walletAddress: string, amount: number): Promise<{ txHash: string }> {
    const txSeed = `${walletAddress}:${amount}:${Date.now()}:${crypto.randomUUID()}`;
    const txHash = crypto.createHash("sha256").update(txSeed).digest("hex");
    return { txHash };
  }
}

export class RewardsService {
  private users = new Map<string, User>();
  private distributions: DistributionRecord[] = [];
  private auditLogs: AuditLog[] = [];
  private config: RewardConfig = defaultConfig;

  constructor(
    private readonly engine = new RewardsEngine(),
    private readonly distributor: TokenDistributor = new InMemoryTokenDistributor(),
  ) {}

  registerUser(walletAddress: string): User {
    const id = crypto.randomUUID();
    const timestamp = now();

    const user: User = {
      id,
      walletAddress,
      points: 0,
      rewardBalance: 0,
      claimedRewards: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.users.set(id, user);
    this.log("user.registered", "system", { userId: id, walletAddress });
    return user;
  }

  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUser(userId: string): User {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  trackActivity(userId: string, pointsDelta: number): { user: User; calculation: RewardCalculation } {
    if (pointsDelta <= 0) {
      throw new Error("pointsDelta must be greater than zero");
    }

    const user = this.getUser(userId);
    user.points += pointsDelta;

    const calculation = this.engine.calculate(pointsDelta, user.points, this.config);
    user.rewardBalance = Number((user.rewardBalance + calculation.rewardAmount).toFixed(4));
    user.updatedAt = now();

    this.log("user.activity_tracked", "system", {
      userId,
      pointsDelta,
      rewardAmount: calculation.rewardAmount,
      tier: calculation.tier,
    });

    return { user, calculation };
  }

  async claimRewards(userId: string): Promise<{ user: User; distribution: DistributionRecord }> {
    const user = this.getUser(userId);
    if (user.rewardBalance <= 0) {
      throw new Error("No rewards to claim");
    }

    const amount = user.rewardBalance;
    const distribution: DistributionRecord = {
      id: crypto.randomUUID(),
      userId,
      walletAddress: user.walletAddress,
      amount,
      status: "pending",
      txHash: null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.distributions.unshift(distribution);

    try {
      const result = await this.distributor.sendReward(user.walletAddress, amount);
      distribution.status = "success";
      distribution.txHash = result.txHash;
      distribution.updatedAt = now();

      user.claimedRewards = Number((user.claimedRewards + amount).toFixed(4));
      user.rewardBalance = 0;
      user.updatedAt = now();

      this.log("rewards.claimed", userId, {
        distributionId: distribution.id,
        amount,
        txHash: distribution.txHash,
      });

      return { user, distribution };
    } catch (error) {
      distribution.status = "failed";
      distribution.updatedAt = now();
      this.log("rewards.claim_failed", userId, {
        distributionId: distribution.id,
        amount,
        error: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
  }

  getRewardConfig(): RewardConfig {
    return this.config;
  }

  updateRewardConfig(config: RewardConfig, actor = "admin"): RewardConfig {
    if (config.baseRewardRate <= 0) {
      throw new Error("baseRewardRate must be greater than zero");
    }
    if (config.tiers.length === 0) {
      throw new Error("At least one reward tier is required");
    }

    this.config = {
      baseRewardRate: config.baseRewardRate,
      tiers: [...config.tiers].sort((a, b) => a.minPoints - b.minPoints),
    };

    this.log("rewards.config_updated", actor, { config: this.config });
    return this.config;
  }

  listDistributions(): DistributionRecord[] {
    return this.distributions;
  }

  listAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  private log(action: string, actor: string, metadata: Record<string, unknown>) {
    this.auditLogs.unshift({
      id: crypto.randomUUID(),
      action,
      actor,
      metadata,
      timestamp: now(),
    });
  }
}
