import { prisma } from "../config/prisma.js";

export async function createRide(data) {
  const rideData = {
    pickup: data.pickup,
    dropoff: data.dropoff,
    status: "requested",
    fare: 0,
    customer: { connect: { user_id: Number(data.customer_id) } }
  };
  return prisma.rides.create({ data: rideData });
}

export async function assignCaptain(rideId, captain_id) {
  return prisma.rides.update({ where: { ride_id: rideId }, data: { captain_id, status: "accepted" } });
}

export async function updateRideStatus(rideId, status) {
  const allowed = ["requested","accepted","ongoing","completed","cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  const update = { status };
  if (status === "ongoing") update.started_at = new Date();
  if (status === "completed") update.ended_at = new Date();
  return prisma.rides.update({ where: { ride_id: rideId }, data: update });
}