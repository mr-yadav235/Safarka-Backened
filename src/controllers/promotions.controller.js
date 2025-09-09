import { prisma } from "../config/prisma.js";
import { badRequest, ok } from "../utils/responses.js";

export async function listPromos(req, res) {
  const promos = await prisma.promotions.findMany({ where: { OR: [{ expiry_date: null }, { expiry_date: { gt: new Date() } }] } });
  return ok(res, promos);
}

export async function applyPromo(req, res) {
  const { code, fare_estimate } = req.body;
  if (!code || fare_estimate == null) return badRequest(res, "code and fare_estimate required");
  const promo = await prisma.promotions.findUnique({ where: { code } });
  if (!promo) return badRequest(res, "Invalid promo code");
  if (promo.expiry_date && promo.expiry_date < new Date()) return badRequest(res, "Promo expired");
  let discounted = Number(fare_estimate);
  if (promo.discount_type === "flat") discounted -= Number(promo.discount_value || 0);
  if (promo.discount_type === "percentage") discounted -= discounted * (Number(promo.discount_value || 0) / 100);
  if (discounted < 0) discounted = 0;
  return ok(res, { original: Number(fare_estimate), discounted, promo });
}