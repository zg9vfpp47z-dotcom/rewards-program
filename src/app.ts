import express from "express";
import { z } from "zod";
import { RewardsService } from "./service";

const registerSchema = z.object({
  walletAddress: z.string().min(8),
});

const activitySchema = z.object({
  pointsDelta: z.number().int().positive(),
});

const configSchema = z.object({
  baseRewardRate: z.number().positive(),
  tiers: z
    .array(
      z.object({
        name: z.string().min(1),
        minPoints: z.number().int().nonnegative(),
        multiplier: z.number().positive(),
      }),
    )
    .min(1),
});

export const createApp = (service = new RewardsService()) => {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.post("/users", (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const user = service.registerUser(parsed.data.walletAddress);
    return res.status(201).json({ user });
  });

  app.get("/users", (_req, res) => {
    return res.status(200).json({ users: service.listUsers() });
  });

  app.post("/users/:userId/activity", (req, res) => {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const result = service.trackActivity(req.params.userId, parsed.data.pointsDelta);
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message === "User not found" ? 404 : 400;
      return res.status(status).json({ error: message });
    }
  });

  app.post("/users/:userId/claim", async (req, res) => {
    try {
      const result = await service.claimRewards(req.params.userId);
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message === "No rewards to claim" ? 400 : 404;
      return res.status(status).json({ error: message });
    }
  });

  app.get("/rewards/config", (_req, res) => {
    return res.status(200).json({ config: service.getRewardConfig() });
  });

  app.put("/admin/rewards/config", (req, res) => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const actor = req.header("x-admin-id") ?? "admin";
    try {
      const config = service.updateRewardConfig(parsed.data, actor);
      return res.status(200).json({ config });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(400).json({ error: message });
    }
  });

  app.get("/rewards/distributions", (_req, res) => {
    return res.status(200).json({ distributions: service.listDistributions() });
  });

  app.get("/admin/audit-logs", (_req, res) => {
    return res.status(200).json({ logs: service.listAuditLogs() });
  });

  return app;
};
