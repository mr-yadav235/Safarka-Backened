import { prisma } from "../config/prisma.js";
import { captainRegisterSchema, loginSchema } from "../utils/validation.js";
import { badRequest, notFound, ok, unauthorized, created } from "../utils/responses.js";
import { registerCaptain as registerCaptainService, loginCaptain } from "../services/auth.service.js";
import { findNearbyCaptains, setCaptainAvailability, updateCaptainGeo, getAllAvailableCaptains } from "../services/geospatial.service.js";

export async function registerCaptain(req, res) {
  const { error, value } = captainRegisterSchema.validate(req.body);
  if (error) return badRequest(res, error.message);
  const captain = await registerCaptainService(value);
  return created(res, { captain });
}

export async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body; // available | on_ride | offline
  const cap = await prisma.Captain.update({ where: { id: id }, data: { current_status: status } });
  await setCaptainAvailability(id, status === "available");
  return ok(res, cap);
}

export async function nearby(req, res) {
  const { lat, lng, radius = 3000, count = 10 } = req.query;
  const ids = await findNearbyCaptains(Number(lng), Number(lat), Number(radius), Number(count));
  const captains = await prisma.Captain.findMany({ 
    where: { id: { in: ids }, current_status: "available" },
    select: { id: true, name: true, phone_number: true, vehicle_type: true, vehicle_number: true }
  });
  return ok(res, captains);
}

export async function heartbeat(req, res) {
  try {
    const id = Number(req.params.id);
    const { lat, lng, speed, heading, accuracy } = req.body;
    
    // Validate coordinates
    if (!lat || !lng) {
      return badRequest(res, "Latitude and longitude are required");
    }
    
    // Prepare additional data
    const additionalData = {};
    if (speed !== undefined) additionalData.speed = Number(speed);
    if (heading !== undefined) additionalData.heading = Number(heading);
    if (accuracy !== undefined) additionalData.accuracy = Number(accuracy);
    
    // Update captain location
    await updateCaptainGeo(id, Number(lng), Number(lat), additionalData);
    
    return ok(res, { 
      captain_id: id, 
      lat: Number(lat), 
      lng: Number(lng),
      timestamp: Date.now(),
      ...additionalData
    });
  } catch (error) {
    console.error("Error updating captain location:", error);
    return badRequest(res, error.message);
  }
}

export async function goOnline(req, res) {
  try {
    const id = req.user.userId;
    const { lat, lng } = req.body;
    
    // Update captain status in database
    const cap = await prisma.Captain.update({ 
      where: { id: id }, 
      data: { current_status: "available" } 
    });
    
    // Set availability in Redis with location if provided
    if (lat && lng) {
      await setCaptainAvailability(id, true, Number(lng), Number(lat));
    } else {
      await setCaptainAvailability(id, true);
    }
    
    return ok(res, { 
      ...cap, 
      message: "Captain is now online and available for rides",
      location: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
    });
  } catch (error) {
    console.error("Error going online:", error);
    return badRequest(res, error.message);
  }
}

export async function goOffline(req, res) {
  const id = req.user.userId;
  const cap = await prisma.Captain.update({ where: { id: id }, data: { current_status: "offline" } });
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
  const captain_id = req.user.userId;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.Ride.findMany({
      where: { captain_id: captain_id },
      orderBy: { created_at: "desc" },
      skip,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true, phone_number: true } }
      }
    }),
    prisma.Ride.count({ where: { captain_id: captain_id } })
  ]);
  return ok(res, { page, pageSize, total, items });
}

export async function myEarnings(req, res) {
  const captain_id = req.user.userId;
  const { from, to } = req.query;
  const where = { captain_id: captain_id, status: "completed" };
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to) where.created_at.lte = new Date(to);
  }
  const agg = await prisma.Ride.aggregate({
    where,
    _sum: { fare: true },
    _count: { _all: true }
  });
  return ok(res, { completedTrips: agg._count._all, totalFare: agg._sum.fare ?? 0 });
}

export async function getAllAvailable(req, res) {
  try {
    const availableCaptains = await getAllAvailableCaptains();
    
    // Get additional captain details from database
    const captainIds = availableCaptains.map(c => c.captain_id);
    const captainDetails = await prisma.Captain.findMany({
      where: { id: { in: captainIds } },
      select: { 
        id: true, 
        name: true, 
        phone_number: true,
        vehicle_type: true, 
        vehicle_number: true,
        current_status: true
      }
    });
    
    // Merge location data with captain details
    const captainsWithDetails = availableCaptains.map(locationData => {
      const details = captainDetails.find(c => c.id === locationData.captain_id);
      return {
        ...details,
        location: {
          lat: locationData.lat,
          lng: locationData.lng,
          timestamp: locationData.timestamp,
          speed: locationData.speed,
          heading: locationData.heading,
          accuracy: locationData.accuracy
        }
      };
    });
    
    return ok(res, { 
      captains: captainsWithDetails,
      count: captainsWithDetails.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error getting all available captains:", error);
    return badRequest(res, error.message);
  }
}