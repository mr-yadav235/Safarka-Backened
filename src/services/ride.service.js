import { prisma } from "../config/prisma.js";
import { findNearbyCaptains } from "./geospatial.service.js";

export async function createRide(data) {
  // Check customer exists
  const customerExists = await prisma.User.findUnique({
    where: { id: Number(data.customer_id) },
  });
  if (!customerExists) throw new Error("Customer not found");

  // Prepare ride data
  const rideData = {
    pickup: data.pickup,
    dropoff: data.dropoff,
    pickup_lat: Number(data.pickup_lat),
    pickup_lng: Number(data.pickup_lng),
    drop_lat: Number(data.drop_lat),
    drop_lng: Number(data.drop_lng),
    status: "pending",
    fare: 0,
    customer: { connect: { id: Number(data.customer_id) } },
  };

  // Create ride
  const ride = await prisma.Ride.create({ data: rideData });

  // Try to automatically assign a captain
  try {
    await autoAssignCaptain(ride.id, data.pickup_lat, data.pickup_lng);
  } catch (error) {
    console.log("Auto-assignment failed:", error.message);
    // Ride is created but no captain assigned yet - this is fine
  }

  return ride;
}



export async function autoAssignCaptain(rideId, pickupLat, pickupLng) {
  // Find nearby available captains
  const nearbycaptain_ids = await findNearbyCaptains(
    Number(pickupLng), 
    Number(pickupLat), 
    5000, // 5km radius
    5     // Get top 5 closest
  );

  if (nearbycaptain_ids.length === 0) {
    throw new Error("No available captains nearby");
  }

  // Get captain details and find the best one
  const captains = await prisma.Captain.findMany({
    where: { 
      id: { in: nearbycaptain_ids },
      current_status: "available"
    },
    select: { id: true, name: true, vehicle_type: true }
  });

  if (captains.length === 0) {
    throw new Error("No available captains found");
  }

  // Assign the first available captain (closest one)
  const selectedCaptain = captains[0];
  return await assignCaptain(rideId, selectedCaptain.id);
}

export async function assignCaptain(rideId, captain_id) {
  // Check if captain exists and is available
  console.log("Assigning captain to ride", rideId, captain_id);
  console.log("Captain ID type:", typeof captain_id);
  console.log("Captain ID value:", captain_id);
  
  if (!captain_id || captain_id === null || captain_id === undefined) {
    throw new Error("Captain ID is required");
  }
  
  const captain = await prisma.Captain.findUnique({
    where: { id: Number(captain_id) }
  });

  if (!captain) {
    throw new Error("Captain not found");
  }

  if (captain.current_status !== "available") {
    throw new Error("Captain is not available");
  }

  // Update ride with captain assignment
  /*const updatedRide = await prisma.Ride.update({ 
    where: { id: rideId }, 
    data: { 
      id: captain_id, 
      status: "accepted" 
    },
    include: {
      customer: { select: { id: true, name: true, phone_number: true } },
      captain: { select: { id: true, name: true, phone_number: true, vehicle_type: true, vehicle_number: true } }
    }
  });
*/
const updatedRide = await prisma.Ride.update({ 
  where: { id: rideId }, 
  data: { 
    captain_id: captain_id, // Correct field
    status: "accepted"
  },
  include: {
    customer: { select: { id: true, name: true, phone_number: true } },
    captain: { select: { id: true, name: true, phone_number: true, vehicle_type: true, vehicle_number: true } }
  }
});
  // Update captain status to on_ride
  await prisma.Captain.update({
    where: { id: captain_id },
    data: { current_status: "on_ride" }
  });

  return updatedRide;
}

export async function updateRideStatus(rideId, status) {
  console.log("Update ride status - Ride ID:", rideId);
  console.log("Update ride status - Status:", status);
  const allowed = ["requested","accepted","ongoing","completed","cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  
  const update = { status };
  if (status === "ongoing") update.started_at = new Date();
  if (status === "completed") update.ended_at = new Date();
  
  const updatedRide = await prisma.Ride.update({ 
    where: { id: rideId }, 
    data: update,
    include: {
      customer: { select: { id: true, name: true, phone_number: true } },
      captain: { select: { id: true, name: true, phone_number: true, vehicle_type: true, vehicle_number: true } }
    }
  });
console.log("Updated ride", updatedRide);
  // If ride is completed or cancelled, make captain available again
  if ((status === "completed" || status === "cancelled") && updatedRide.captain_id) {
    await prisma.Captain.update({
      where: { id: updatedRide.captain_id },
      data: { current_status: "available" }
    });
  }

  return updatedRide;
}

export async function findAvailableCaptains(pickupLat, pickupLng, radius = 5000, count = 10) {
  const nearbycaptain_ids = await findNearbyCaptains(
    Number(pickupLng), 
    Number(pickupLat), 
    radius,
    count
  );

  if (nearbycaptain_ids.length === 0) {
    return [];
  }

  const captains = await prisma.Captain.findMany({
    where: { 
      id: { in: nearbycaptain_ids },
      current_status: "available"
    },
    select: { 
      id: true, 
      name: true, 
      phone_number: true,
      vehicle_type: true, 
      vehicle_number: true,
      current_status: true
    }
  });

  return captains;
}