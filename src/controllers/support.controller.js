import { prisma } from "../config/prisma.js";
import { badRequest, ok } from "../utils/responses.js";

export async function createTicket(req, res) {
  const { user_id, ride_id, issue_type, description } = req.body;
  if (!user_id || !issue_type) return badRequest(res, "user_id and issue_type required");
  const t = await prisma.support_tickets.create({ data: { user_id, ride_id: ride_id || null, issue_type, description: description || null } });
  return ok(res, t);
}

export async function updateTicket(req, res) {
  const id = Number(req.params.ticketId);
  const { status } = req.body;
  const t = await prisma.support_tickets.update({ where: { ticket_id: id }, data: { status } });
  return ok(res, t);
}