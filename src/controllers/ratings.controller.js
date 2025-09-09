import { prisma } from "../config/prisma.js";
import { badRequest, ok } from "../utils/responses.js";

export async function giveRating(req, res) {
  const rideId = Number(req.params.rideId);
  const { given_by, given_to, score, feedback } = req.body;
  if (!given_by || !given_to || !score) return badRequest(res, "given_by, given_to, score required");
  const rating = await prisma.ratings.create({ data: { ride_id: rideId, given_by, given_to, score, feedback: feedback || null } });
  return ok(res, rating);
}

export async function getUserRatings(req, res) {
  const id = Number(req.params.id);
  const ratings = await prisma.ratings.findMany({ where: { given_to: id }, orderBy: { created_at: "desc" } });
  return ok(res, ratings);
}