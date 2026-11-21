import type { Request, Response } from "express";
import { getSubscription } from "./subscription.service.js";

export const readSubscription = async (req: Request, res: Response) => {
  const subscription = await getSubscription(req.user!.id);
  return res.json({ success: true, data: { subscription } });
};

export const revenueCatWebhook = async (req: Request, res: Response) => {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  if (!secret) {
    return res.status(503).json({ success: false, message: "Webhook non configuré" });
  }
  if (req.get("authorization") !== secret) {
    return res.status(401).json({ success: false, message: "Non autorisé" });
  }

  const event = req.body?.event;
  if (
    typeof event?.app_user_id !== "string" ||
    typeof event?.type !== "string"
  ) {
    return res.status(400).json({ success: false, message: "Événement invalide" });
  }

  try {
    const { applyRevenueCatEvent } = await import("./subscription.service.js");
    await applyRevenueCatEvent(event);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("RevenueCat webhook error:", error);
    return res.status(400).json({ success: false, message: "Événement non traité" });
  }
};
