import { prisma } from "../config/prisma.js";
import { notFound, ok } from "../utils/responses.js";

export async function getUser(req, res) {
  const id = Number(req.params.id);
  const user = await prisma.users.findUnique({ where: { user_id: id }, select: { user_id: true, name: true, phone_number: true, email: true, role: true } });
  if (!user) return notFound(res);
  return ok(res, user);
}

export async function getUserRides(req, res) {
  const id = Number(req.params.id);
  const rides = await prisma.rides.findMany({ where: { OR: [{ customer_id: id }, { captain_id: id }] }, orderBy: { created_at: "desc" } });
  return ok(res, rides);
}