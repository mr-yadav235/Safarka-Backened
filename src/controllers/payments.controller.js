import { prisma } from "../config/prisma.js";
import { badRequest, ok } from "../utils/responses.js";

export async function initiatePayment(req, res) {
  const { ride_id, user_id, amount, method } = req.body;
  if (!ride_id || !user_id || !amount || !method) return badRequest(res, "ride_id, user_id, amount, method required");
  const payment = await prisma.payments.create({ data: { ride_id, user_id, amount, method, status: "pending" } });
  return ok(res, { payment });
}

export async function confirmPayment(req, res) {
  const { payment_id, status, transaction_reference } = req.body;
  if (!payment_id || !status) return badRequest(res, "payment_id and status required");
  const allowed = ["success","failed"];
  if (!allowed.includes(status)) return badRequest(res, "invalid status");
  const pay = await prisma.payments.update({ where: { payment_id }, data: { status, transaction_reference } });

  if (status === "success") {
    // log and update wallet if needed
    await prisma.transactions_log.create({ data: { user_id: pay.user_id, ride_id: pay.ride_id, amount: pay.amount, type: "debit" } });
  }
  return ok(res, pay);
}