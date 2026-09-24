import express, { Request, Response } from "express";
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

type AppOptions = {
  adminToken?: string;
};

export const createApp = (service = new RewardsService(), options: AppOptions = {}) => {
  const app = express();
  const adminToken = options.adminToken ?? process.env.ADMIN_API_TOKEN ?? "";
  app.use(express.json());

  const requireAdmin = (req: Request, res: Response): string | null => {
    if (!adminToken) {
      res.status(500).json({ error: "Admin API token is not configured" });
      return null;
    }

    const actor = req.header("x-admin-id");
    const token = req.header("x-admin-token");
    if (!actor || !token || token !== adminToken) {
      res.status(401).json({ error: "Unauthorized admin request" });
      return null;
    }

    return actor;
  };

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
      const status =
        message === "No rewards to claim" ? 400 : message === "User not found" ? 404 : 502;
      return res.status(status).json({ error: message });
    }
  });

  app.get("/rewards/config", (_req, res) => {
    return res.status(200).json({ config: service.getRewardConfig() });
  });

  app.put("/admin/rewards/config", (req, res) => {
    const actor = requireAdmin(req, res);
    if (!actor) {
      return;
    }

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const config = service.updateRewardConfig(parsed.data, actor);
      return res.status(200).json({ config });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(400).json({ error: message });
    }
  });

  app.get("/rewards/distributions", (_req, res) => {
    const actor = requireAdmin(_req, res);
    if (!actor) {
      return;
    }

    return res.status(200).json({ distributions: service.listDistributions() });
  });

  app.get("/admin/audit-logs", (_req, res) => {
    const actor = requireAdmin(_req, res);
    if (!actor) {
      return;
    }

    return res.status(200).json({ logs: service.listAuditLogs() });
  });

  return app;
};
