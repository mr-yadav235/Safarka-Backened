import { prisma } from "../config/prisma.js";
import { findNearbyCaptains, getDistanceToCaptain } from "./geospatial.service.js";

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
    requested_vehicle_type: data.requested_vehicle_type || "car",
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
  // Get ride details to check requested vehicle type
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: { requested_vehicle_type: true }
  });

  if (!ride) {
    throw new Error("Ride not found");
  }

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

  // Get captain details with their current vehicle and find the best match
  const captains = await prisma.captain.findMany({
    where: { 
      id: { in: nearbycaptain_ids },
      current_status: "available",
      current_vehicle_id: { not: null } // Only captains with active vehicles
    },
    select: { 
      id: true, 
      name: true, 
      current_vehicle: {
        select: {
          id: true,
          vehicle_type: true,
          make: true,
          model: true,
          color: true,
          plate_number: true,
          capacity: true
        }
      }
    }
  });

  if (captains.length === 0) {
    throw new Error("No available captains with vehicles found");
  }

  // Find captain with matching vehicle type, or use the first available
  let selectedCaptain = captains.find(captain => 
    captain.current_vehicle?.vehicle_type === ride.requested_vehicle_type
  );

  // If no exact match, use the first available captain
  if (!selectedCaptain) {
    selectedCaptain = captains[0];
  }

  return await assignCaptain(rideId, selectedCaptain.id, selectedCaptain.current_vehicle?.id);
}

export async function assignCaptain(rideId, captain_id, vehicle_id = null) {
  // Check if captain exists and is available
  console.log("Assigning captain to ride", rideId, captain_id, "with vehicle", vehicle_id);
  console.log("Captain ID type:", typeof captain_id);
  console.log("Captain ID value:", captain_id);
  
  if (!captain_id || captain_id === null || captain_id === undefined) {
    throw new Error("Captain ID is required");
  }
  
  const captain = await prisma.captain.findUnique({
    where: { id: Number(captain_id) },
    include: {
      current_vehicle: {
        select: {
          id: true,
          vehicle_type: true,
          make: true,
          model: true,
          color: true,
          plate_number: true,
          capacity: true
        }
      }
    }
  });

  if (!captain) {
    throw new Error("Captain not found");
    console.log("Captain not found");
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
const updatedRide = await prisma.ride.update({ 
  where: { id: rideId }, 
  data: { 
    captain_id: captain_id,
    vehicle_id: vehicle_id || captain.current_vehicle?.id, // Set the vehicle ID
    status: "accepted"
  },
  include: {
    customer: { select: { id: true, name: true, phone_number: true } },
    captain: { 
      select: { 
        id: true, 
        name: true, 
        phone_number: true,
        current_vehicle: {
          select: {
            id: true,
            vehicle_type: true,
            make: true,
            model: true,
            color: true,
            plate_number: true,
            capacity: true
          }
        }
      } 
    },
    vehicle: {
      select: {
        id: true,
        vehicle_type: true,
        make: true,
        model: true,
        color: true,
        plate_number: true,
        capacity: true
      }
    }
  }
});
  // Update captain status to on_ride
  await prisma.captain.update({
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
  try {
    // Use Redis GEO to find nearby available captains
    const nearbycaptain_ids = await findNearbyCaptains(
      Number(pickupLng), 
      Number(pickupLat), 
      radius,
      count
    );

    if (nearbycaptain_ids.length === 0) {
      console.log(`No available captains found within ${radius}m of ${pickupLat}, ${pickupLng}`);
      return [];
    }

    // Get captain details from database
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

    // Add distance information for each captain
    const captainsWithDistance = await Promise.all(
      captains.map(async (captain) => {
        const distance = await getDistanceToCaptain(captain.id, pickupLng, pickupLat);
        return {
          ...captain,
          distance: distance ? Math.round(distance) : null
        };
      })
    );

    // Sort by distance
    captainsWithDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    console.log(`Found ${captainsWithDistance.length} available captains within ${radius}m`);
    return captainsWithDistance;
    
  } catch (error) {
    console.error("Error finding available captains:", error);
    return [];
  }
}