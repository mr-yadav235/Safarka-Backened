import { prisma } from "../config/prisma.js";
import { rideRequestSchema } from "../utils/validation.js";
import { badRequest, notFound, ok } from "../utils/responses.js";
import { createRide, updateRideStatus, assignCaptain } from "../services/ride.service.js";
import { getCaptainLiveLocation } from "../services/geospatial.service.js";

export async function requestRide(req, res) {
  console.log('requestbody'+req.body);
  const { error, value } = rideRequestSchema.validate(req.body);
  console.log(error);
  if (error) return badRequest(res, error.message);
  console.log('value'+value)
  const ride = await createRide(value);
  return ok(res, ride);
}

export async function acceptRide(req, res) {
  const rideId = Number(req.params.rideId);
  const { captain_id } = req.body;
  const ride = await assignCaptain(rideId, Number(captain_id));
  return ok(res, ride);
}

export async function updateStatus(req, res) {
  const rideId = Number(req.params.rideId);
  const { status } = req.body;
  const ride = await updateRideStatus(rideId, status);
  return ok(res, ride);
}

export async function getRide(req, res) {
  const rideId = Number(req.params.rideId);
  const ride = await prisma.rides.findUnique({ where: { ride_id: rideId } });
  if (!ride) return notFound(res);
  return ok(res, ride);
}

export async function getLive(req, res) {
  const rideId = Number(req.params.rideId);
  const ride = await prisma.rides.findUnique({ where: { ride_id: rideId } });
  if (!ride) return notFound(res);
  if (!ride.captain_id) return badRequest(res, "No captain assigned");
  const loc = await getCaptainLiveLocation(ride.captain_id);
  return ok(res, { rideId, captain_id: ride.captain_id, live: loc });
}

export async function pushLocation(req, res) {
  const rideId = Number(req.params.rideId);
  const { latitude, longitude, speed } = req.body;
  const ride = await prisma.rides.findUnique({ where: { ride_id: rideId } });
  if (!ride) return notFound(res);
  const rec = await prisma.ride_tracking.create({ data: { ride_id: rideId, latitude: Number(latitude), longitude: Number(longitude), speed: speed ? Number(speed) : null } });
  return ok(res, rec);
}