import { prisma } from "../config/prisma.js";
import { rideRequestSchema } from "../utils/validation.js";
import { badRequest, notFound, ok } from "../utils/responses.js";
import { createRide, updateRideStatus, assignCaptain, findAvailableCaptains } from "../services/ride.service.js";
import { getCaptainLiveLocation } from "../services/geospatial.service.js";

export async function requestRide(req, res) {
  try {
    console.log("Ride request - User:", req.user);
    console.log("Ride request - Body:", req.body);
    
    const { error, value } = rideRequestSchema.validate(req.body);
    if (error) {
      console.log("Ride request - Validation error:", error.message);
      return badRequest(res, error.message);
    }

    const ride = await createRide(value);
    console.log("Ride request - Created ride:", ride.id);
    return ok(res, ride);
  } catch (err) {
    console.log("Ride request - Error:", err.message);
    return badRequest(res, err.message);
  }
}


export async function acceptRide(req, res) {
  try {
    const rideId = Number(req.params.rideId);
    const captain_id = req.user.userId; // Get captain ID from authenticated user
    
    console.log("Accept ride - Ride ID:", rideId);
    console.log("Accept ride - Captain ID:", captain_id);
    console.log("Accept ride - User:", req.user);
    
    if (!captain_id) {
      return badRequest(res, "Captain ID not found in token");
    }
    
    const ride = await assignCaptain(rideId, captain_id);
    return ok(res, ride);
  } catch (err) {
    console.log("Accept ride - Error:", err.message);
    return badRequest(res, err.message);
  }
}

export async function updateStatus(req, res) {
  const rideId = Number(req.params.rideId);
  console.log("Update status - Ride ID:", rideId);
  const { status } = req.body;
  const ride = await updateRideStatus(rideId, status);
  return ok(res, ride);
}

export async function getRide(req, res) {
  const rideId = Number(req.params.rideId);
  const ride = await prisma.Ride.findUnique({ 
    where: { id: rideId },
    include: {
      customer: { select: { id: true, name: true, phone_number: true } },
      captain: { select: { id: true, name: true, phone_number: true, vehicle_type: true, vehicle_number: true } }
    }
  });
  if (!ride) return notFound(res);
  return ok(res, ride);
}

export async function getLive(req, res) {
  const rideId = Number(req.params.rideId);
  const ride = await prisma.Ride.findUnique({ where: { id: rideId } });
  if (!ride) return notFound(res);
  if (!ride.captain_id) return badRequest(res, "No captain assigned");
  const loc = await getCaptainLiveLocation(ride.captain_id);
  return ok(res, { rideId, captain_id: ride.captain_id, live: loc });
}

export async function pushLocation(req, res) {
  const rideId = Number(req.params.rideId);
  const { latitude, longitude, speed } = req.body;
  const ride = await prisma.Ride.findUnique({ where: { id: rideId } });
  if (!ride) return notFound(res);
  // Note: ride_tracking table doesn't exist in current schema
  // You may need to add this table to your schema or use a different approach
  return ok(res, { message: "Location tracking not implemented yet" });
}

export async function findCaptains(req, res) {
  try {
    const { lat, lng, radius = 5000, count = 10 } = req.query;
    
    if (!lat || !lng) {
      return badRequest(res, "Latitude and longitude are required");
    }

    const captains = await findAvailableCaptains(
      Number(lat), 
      Number(lng), 
      Number(radius), 
      Number(count)
    );

    return ok(res, { captains, count: captains.length });
  } catch (error) {
    return badRequest(res, error.message);
  }
}

export async function getPendingRides(req, res) {
  try {
    const captain_id = req.user.userId;
    console.log("Getting pending rides for captain:", captain_id);
    
    // Get rides that are requested but not yet assigned to any captain
    const pendingRides = await prisma.Ride.findMany({
      where: {
        status: "pending",
        captain_id: null
      },
      include: {
        customer: { select: { id: true, name: true, phone_number: true } }
      },
      orderBy: { created_at: "desc" },
      take: 10
    });

    console.log("Found pending rides:", pendingRides.length);
    return ok(res, { rides: pendingRides });
  } catch (error) {
    console.log("Get pending rides error:", error.message);
    return badRequest(res, error.message);
  }
}

export async function getCaptainRideHistory(req, res) {
  try {
    const captain_id = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    
    console.log("Getting ride history for captain:", captain_id);
    
    const whereClause = { captain_id: Number(captain_id) };
    if (status) {
      whereClause.status = status;
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [rides, total] = await Promise.all([
      prisma.Ride.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, name: true, phone_number: true } }
        },
        orderBy: { created_at: "desc" },
        skip,
        take: Number(limit)
      }),
      prisma.Ride.count({ where: whereClause })
    ]);

    console.log("Found ride history:", rides.length, "of", total);
    return ok(res, { 
      rides, 
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.log("Get ride history error:", error.message);
    return badRequest(res, error.message);
  }
}