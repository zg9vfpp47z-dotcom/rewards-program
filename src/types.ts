export type Tier = {
  name: string;
  minPoints: number;
  multiplier: number;
};

export type RewardConfig = {
  baseRewardRate: number;
  tiers: Tier[];
};

export type User = {
  id: string;
  walletAddress: string;
  points: number;
  rewardBalance: number;
  claimedRewards: number;
  createdAt: string;
  updatedAt: string;
};

export type RewardCalculation = {
  tier: string;
  multiplier: number;
  rewardAmount: number;
};

export type DistributionRecord = {
  id: string;
  userId: string;
  walletAddress: string;
  amount: number;
  status: "pending" | "success" | "failed";
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  action: string;
  actor: string;
  metadata: Record<string, unknown>;
  timestamp: string;
};
