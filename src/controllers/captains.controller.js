import { prisma } from "../config/prisma.js";
import { captainRegisterSchema, loginSchema } from "../utils/validation.js";
import { badRequest, notFound, ok, unauthorized, created } from "../utils/responses.js";
import { registerCaptain as registerCaptainService, loginCaptain } from "../services/auth.service.js";
import { findNearbyCaptains, setCaptainAvailability, updateCaptainGeo } from "../services/geospatial.service.js";

export async function registerCaptain(req, res) {
  const { error, value } = captainRegisterSchema.validate(req.body);
  if (error) return badRequest(res, error.message);
  const captain = await registerCaptainService(value);
  return created(res, { captain });
}

export async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body; // available | on_ride | offline
  const cap = await prisma.captains.update({ where: { captain_id: id }, data: { current_status: status } });
  await setCaptainAvailability(id, status === "available");
  return ok(res, cap);
}

export async function nearby(req, res) {
  const { lat, lng, radius = 3000, count = 10 } = req.query;
  const ids = await findNearbyCaptains(Number(lng), Number(lat), Number(radius), Number(count));
  const captains = await prisma.captains.findMany({ where: { captain_id: { in: ids } }, include: { user: { select: { name: true, phone_number: true } } } });
  return ok(res, captains);
}

export async function heartbeat(req, res) {
  const id = Number(req.params.id);
  const { lat, lng } = req.body;
  await updateCaptainGeo(id, Number(lng), Number(lat));
  return ok(res, { captain_id: id, lat: Number(lat), lng: Number(lng) });
}

export async function goOnline(req, res) {
  const id = req.user.userId;
  const cap = await prisma.captains.update({ where: { captain_id: id }, data: { current_status: "available" } });
  await setCaptainAvailability(id, true);
  return ok(res, cap);
}

export async function goOffline(req, res) {
  const id = req.user.userId;
  const cap = await prisma.captains.update({ where: { captain_id: id }, data: { current_status: "offline" } });
  await setCaptainAvailability(id, false);
  return ok(res, cap);
}

export async function captainLogin(req, res) {
  const { error, value } = loginSchema.validate(req.body);
  console.log("Validation error:", error);
  console.log("Request body:", req.body);
  if (error) return badRequest(res, error.message);
  const result = await loginCaptain(value);
  console.log("Login result:", result);
  if (!result) return unauthorized(res, "Invalid credentials");
  return ok(res, result);
}

export async function myTrips(req, res) {
  const captainId = req.user.userId;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.rides.findMany({
      where: { captain_id: captainId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.rides.count({ where: { captain_id: captainId } })
  ]);
  return ok(res, { page, pageSize, total, items });
}

export async function myEarnings(req, res) {
  const captainId = req.user.userId;
  const { from, to } = req.query;
  const where = { captain_id: captainId, status: "completed" };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  const agg = await prisma.rides.aggregate({
    where,
    _sum: { fare: true },
    _count: { _all: true }
  });
  return ok(res, { completedTrips: agg._count._all, totalFare: agg._sum.fare ?? 0 });
}