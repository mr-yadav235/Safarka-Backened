import { prisma } from "../config/prisma.js";
import { vehicleRegisterSchema } from "../utils/validation.js";
import { badRequest, notFound, ok } from "../utils/responses.js";

export async function registerVehicle(req, res) {
  try {
    console.log("Vehicle registration - User:", req.user);
    console.log("Vehicle registration - Body:", req.body);
    
    const captainId = req.user.userId; // Get captain ID from authenticated user
    
    const { error, value } = vehicleRegisterSchema.validate(req.body);
    if (error) {
      console.log("Vehicle registration - Validation error:", error.message);
      return badRequest(res, error.message);
    }

    // Check if captain exists
    const captain = await prisma.captain.findUnique({
      where: { id: captainId }
    });

    if (!captain) {
      return notFound(res, "Captain not found");
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        captain_id: captainId,
        vehicle_type: value.vehicle_type,
        make: value.make,
        model: value.model,
        year: value.year,
        color: value.color,
        plate_number: value.plate_number,
        capacity: value.capacity || 4
      }
    });

    console.log("Vehicle registration - Created vehicle:", vehicle.id);
    return ok(res, vehicle);
  } catch (err) {
    console.log("Vehicle registration - Error:", err.message);
    return badRequest(res, err.message);
  }
}

export async function getCaptainVehicles(req, res) {
  try {
    const captainId = req.user.userId;
    console.log("Get captain vehicles - Captain ID:", captainId);

    const vehicles = await prisma.vehicle.findMany({
      where: { captain_id: captainId, is_active: true }
    });
    return ok(res, vehicles);
  } catch (err) {
    console.log("Get captain vehicles - Error:", err.message);
    return badRequest(res, err.message);
  }
}

export async function setCurrentVehicle(req, res) {
  try {
    const captainId = req.user.userId;
    const { vehicle_id } = req.body;
    console.log("Set current vehicle - Captain ID:", captainId, "Vehicle ID:", vehicle_id);

    // Check if vehicle belongs to captain
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle_id, captain_id: captainId }
    });

    if (!vehicle) {
      return notFound(res, "Vehicle not found or does not belong to captain");
    }

    // Update captain's current_vehicle_id
    await prisma.captain.update({
      where: { id: captainId },
      data: { current_vehicle_id: vehicle_id }
    });

    return ok(res, { message: "Current vehicle set successfully" });
  } catch (err) {
    console.log("Set current vehicle - Error:", err.message);
    return badRequest(res, err.message);
  }
}

export async function getCurrentVehicle(req, res) {
  try {
    const captainId = req.user.userId;
    console.log("Get current vehicle - Captain ID:", captainId);

    const captain = await prisma.captain.findUnique({
      where: { id: captainId },
      include: { current_vehicle: true }
    });

    if (!captain) {
      return notFound(res, "Captain not found");
    }

    return ok(res, captain.current_vehicle);
  } catch (err) {
    console.log("Get current vehicle - Error:", err.message);
    return badRequest(res, err.message);
  }
}
