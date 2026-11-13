import type { Request, Response } from "express";
import { getDailyQuota } from "./quota.service.js";

export const readDailyQuota = async (req: Request, res: Response) => {
  const quota = await getDailyQuota(req.user!.id);
  return res.json({ success: true, data: { quota } });
};
