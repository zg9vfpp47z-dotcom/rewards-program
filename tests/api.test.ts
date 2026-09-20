import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("Rewards API", () => {
  it("registers, tracks activity, and claims rewards", async () => {
    const app = createApp(undefined, { adminToken: "test-admin-token" });

    const createUser = await request(app).post("/users").send({ walletAddress: "wallet-test-123456" });
    expect(createUser.status).toBe(201);
    const userId = createUser.body.user.id as string;

    const activity = await request(app).post(`/users/${userId}/activity`).send({ pointsDelta: 200 });
    expect(activity.status).toBe(200);
    expect(activity.body.calculation.tier).toBe("Silver");

    const claim = await request(app).post(`/users/${userId}/claim`).send();
    expect(claim.status).toBe(200);
    expect(claim.body.distribution.status).toBe("success");

    const distributions = await request(app)
      .get("/rewards/distributions")
      .set("x-admin-id", "admin-1")
      .set("x-admin-token", "test-admin-token");
    expect(distributions.status).toBe(200);
    expect(distributions.body.distributions).toHaveLength(1);
  });

  it("updates reward config from admin endpoint", async () => {
    const app = createApp(undefined, { adminToken: "test-admin-token" });
    const response = await request(app)
      .put("/admin/rewards/config")
      .set("x-admin-id", "admin-1")
      .set("x-admin-token", "test-admin-token")
      .send({
        baseRewardRate: 0.2,
        tiers: [
          { name: "Elite", minPoints: 250, multiplier: 2 },
          { name: "Starter", minPoints: 0, multiplier: 1 },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.config.baseRewardRate).toBe(0.2);
    expect(response.body.config.tiers).toHaveLength(2);
    expect(response.body.config.tiers[0].name).toBe("Starter");
    expect(response.body.config.tiers[1].name).toBe("Elite");
  });

  it("rejects unauthenticated admin access", async () => {
    const app = createApp(undefined, { adminToken: "test-admin-token" });

    const updateAttempt = await request(app).put("/admin/rewards/config").send({
      baseRewardRate: 0.2,
      tiers: [{ name: "Tier", minPoints: 0, multiplier: 1 }],
    });
    expect(updateAttempt.status).toBe(401);

    const logsAttempt = await request(app).get("/admin/audit-logs");
    expect(logsAttempt.status).toBe(401);

    const distributionsAttempt = await request(app).get("/rewards/distributions");
    expect(distributionsAttempt.status).toBe(401);
  });

  it("rejects invalid tier boundaries on admin config updates", async () => {
    const app = createApp(undefined, { adminToken: "test-admin-token" });

    const invalidStartTier = await request(app)
      .put("/admin/rewards/config")
      .set("x-admin-id", "admin-1")
      .set("x-admin-token", "test-admin-token")
      .send({
        baseRewardRate: 0.2,
        tiers: [
          { name: "Tier1", minPoints: 10, multiplier: 1 },
          { name: "Tier2", minPoints: 200, multiplier: 2 },
        ],
      });
    expect(invalidStartTier.status).toBe(400);

    const duplicateBoundary = await request(app)
      .put("/admin/rewards/config")
      .set("x-admin-id", "admin-1")
      .set("x-admin-token", "test-admin-token")
      .send({
        baseRewardRate: 0.2,
        tiers: [
          { name: "Tier1", minPoints: 0, multiplier: 1 },
          { name: "Tier2", minPoints: 0, multiplier: 2 },
        ],
      });
    expect(duplicateBoundary.status).toBe(400);

    const invalidRate = await request(app)
      .put("/admin/rewards/config")
      .set("x-admin-id", "admin-1")
      .set("x-admin-token", "test-admin-token")
      .send({
        baseRewardRate: 0,
        tiers: [
          { name: "Tier1", minPoints: 0, multiplier: 1 },
          { name: "Tier2", minPoints: 100, multiplier: 2 },
        ],
      });
    expect(invalidRate.status).toBe(400);
  });
});
