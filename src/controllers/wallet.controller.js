import { prisma } from "../config/prisma.js";
import { badRequest, ok } from "../utils/responses.js";

export async function getWallet(req, res) {
  const userId = Number(req.params.userId);
  const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });
  return ok(res, wallet);
}

export async function topup(req, res) {
  const userId = Number(req.params.userId);
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) return badRequest(res, "Positive amount required");
  const w = await prisma.wallet.update({ where: { user_id: userId }, data: { balance: { increment: Number(amount) } } });
  await prisma.transactions_log.create({ data: { user_id: userId, amount: amount, type: "credit" } });
  return ok(res, w);
}