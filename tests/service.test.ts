import { describe, expect, it } from "vitest";
import { RewardsService } from "../src/service";

describe("RewardsService", () => {
  it("calculates rewards using tier multipliers", () => {
    const service = new RewardsService();
    const user = service.registerUser("wallet-12345678");

    const first = service.trackActivity(user.id, 80);
    expect(first.calculation.tier).toBe("Bronze");
    expect(first.calculation.rewardAmount).toBe(8);

    const second = service.trackActivity(user.id, 120);
    expect(second.calculation.tier).toBe("Silver");
    expect(second.calculation.rewardAmount).toBe(15);

    expect(second.user.rewardBalance).toBe(23);
  });

  it("claims rewards and tracks distribution", async () => {
    const service = new RewardsService();
    const user = service.registerUser("wallet-abcdefgh");

    service.trackActivity(user.id, 100);
    const result = await service.claimRewards(user.id);

    expect(result.distribution.status).toBe("success");
    expect(result.distribution.txHash).toBeTruthy();
    expect(result.user.rewardBalance).toBe(0);
    expect(result.user.claimedRewards).toBe(12.5);
    expect(service.listDistributions()).toHaveLength(1);
  });
});
