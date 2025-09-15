import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";

const BACKEND_API_URL = "http://localhost:3000"; // your backend API
const REDIS_BACKEND_API_URL = "http://192.168.1.54:5002"; // your REDIS GEO backend API

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or ["http://localhost:19006"] for Expo
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS", "PUT", "HEAD", "CONNECT"],
    credentials: true,
  },
  transports: ["websocket"], // force websocket only
});

function assignRideToNextCaptain(ride, captainsList, index) {
  console.log(ride, "ride data");
  if (index >= captainsList.length) {
    console.log(`❌ No captains available for ride ${ride.id}`);
    io.to(riders.get(ride.riderId)).emit("no-captain-available", ride);
    return;
  }

  const captainId = captainsList[index];
  const captainSocket = captains.get(String(captainId));
  
  // Debug: Show what's in the captains map and what we're looking for
  console.log("🔍 DEBUG CAPTAIN LOOKUP:");
  console.log("  - Looking for captainId:", captainId, "type:", typeof captainId);
  console.log("  - String version:", String(captainId));
  console.log("  - captains.get(String(captainId)):", captainSocket);
  console.log("  - Full captains map keys:", Array.from(captains.keys()));
  console.log("  - Full captains map:", Object.fromEntries(captains));
  console.log(`👀 Checking captain ${captainId} at index ${index}, socket: ${captainSocket}`);

  if (!captainSocket) {
    console.log(`⚠️ Captain ${captainId} not connected, trying next...`);
    return assignRideToNextCaptain(ride, captainsList, index + 1);
  }
  
  const rideForCaptain = {
    id: ride.id.toString(),
    pickup: ride.pickup,
    dropoff: ride.dropoff,
    pickupLat: ride.pickup_lat,    // snake_case → camelCase
    pickupLng: ride.pickup_lng,    // snake_case → camelCase
    dropLat: ride.drop_lat,        // snake_case → camelCase
    dropLng: ride.drop_lng,        // snake_case → camelCase
    fare: ride.fare
  };

  console.log("rideForCaptain", rideForCaptain);
  
  console.log(`👨‍✈️ Offering ride ${ride.id} to captain ${captainId} at socket ${captainSocket}`);
  // Send ride offer to captain
  io.to(captainSocket).emit("new-ride", rideForCaptain);
  console.log(`➡️ Ride ${ride.id} offered to captain ${captainId}`);

  // Wait 10 seconds for acceptance
  setTimeout(async () => {
    try {
      // Check from Redis if ride is accepted
      const statusRes = await axios.get(`${REDIS_BACKEND_API_URL}/rides/${ride.id}`);
      if (statusRes.data.status !== "accepted") {
        console.log(`⏳ Captain ${captainId} did not accept ride ${ride.id}, retrying...`);
        assignRideToNextCaptain(ride, captainsList, index + 1);
      }
    } catch (err) {
      console.error("❌ Failed to check ride status:", err.message);
    }
  }, 10000);
}

// Track connected clients
const riders = new Map();   // riderId -> socketId
const captains = new Map(); // captainId -> socketId
console.log("🟢 In-memory maps for riders and captains initialized.", captains);

// 🔹 Middleware: Validate JWT before connection
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized: No token"));

    // Validate token with backend
    const res = await axios.get(`${BACKEND_API_URL}/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Attach full user object to socket
    socket.user = res.data.data.user; // { id, name, role, ... }
    return next();
  } catch (err) {
    console.error("Auth failed:", err.message);
    return next(new Error("Unauthorized: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`✅ Socket connected: ${socket.id}, user:`, socket.user);

  // 🔹 Log all incoming events
  socket.onAny((event, data) => {
    console.log(`⬅️ Incoming event: ${event}`, data);
  });

  // 🔹 Wrap emit to log outgoing events
  const originalEmit = socket.emit;
  socket.emit = (event, ...args) => {
    console.log(`➡️ Outgoing event: ${event}`, args);
    originalEmit.call(socket, event, ...args);
  };

  // Rider register
  socket.on("register-rider", ({ riderId }) => {
    riders.set(String(riderId), socket.id);
    console.log(`✅ Rider ${riderId} registered with socket ${socket.id}`);
    console.log("  - riderId type:", typeof riderId);
    console.log("  - riderId value:", riderId);
    console.log("  - stored as string:", String(riderId));
    console.log("  - socket.id:", socket.id);
    console.log("  - riders.get(String(riderId)):", riders.get(String(riderId)));
    console.log("  - All rider keys:", Array.from(riders.keys()));
    console.log("  - Full riders map:", Object.fromEntries(riders));
  });

  // Captain register
  socket.on("register-captain", ({ captainId }) => {
    captains.set(String(captainId), socket.id);
    console.log(`✅ Captain ${captainId} registered with socket ${socket.id}`);
    console.log("  - captainId type:", typeof captainId);
    console.log("  - captainId value:", captainId);
    console.log("  - stored as string:", String(captainId));
    console.log("  - socket.id:", socket.id);
    console.log("  - captains.get(String(captainId)):", captains.get(String(captainId)));
    console.log("  - All captain keys:", Array.from(captains.keys()));
    console.log("  - Full captains map:", Object.fromEntries(captains));
  });

  // Ride request
  socket.on("ride-request", async (data) => {
    console.log("🚨 ride-request received from client:", data);

    try {
      // Call backend to create ride
      const response = await axios.post(`${BACKEND_API_URL}/rides/request`, data, {
        headers: { Authorization: `Bearer ${socket.handshake.auth.token}` },
      });

      const ride = response.data.data; // Use the nested data object
      console.log("✅ ride-request created in backend:", ride);
      console.log("🔍 Ride object structure:");
      console.log("  - ride:", ride);
      console.log("  - ride.id:", ride.id);
      console.log("  - response.data:", response.data);

      // Create ride in Redis for lifecycle management
      try {
        await axios.post(`${REDIS_BACKEND_API_URL}/rides/${ride.id}/create`, {
          customerId: ride.customer_id,
          pickup: ride.pickup,
          dropoff: ride.dropoff,
          pickupLat: ride.pickup_lat,
          pickupLng: ride.pickup_lng,
          dropLat: ride.drop_lat,
          dropLng: ride.drop_lng,
          fare: ride.fare,
          status: 'pending'
        });
        console.log("✅ Ride created in Redis for lifecycle management");
      } catch (redisErr) {
        console.error("⚠️ Failed to create ride in Redis:", redisErr.message);
        // Continue anyway - the ride exists in main backend
      }

      // 1️⃣ Get nearby captains from Redis service
      console.log("🔍 Fetching nearby captains from Redis service...", data);
      const geoRes = await axios.get(`${REDIS_BACKEND_API_URL}/nearby`, {
        params: { lat: data.pickup_lat, lng: data.pickup_lng, radius: 5 },
      });

      const nearbyCaptains = geoRes.data.nearby || [];
      console.log("📍 Nearby captains:", nearbyCaptains);

      // 2️⃣ Start assignment loop
      assignRideToNextCaptain(ride, nearbyCaptains, 0);
    } catch (err) {
      console.error("❌ Ride request failed:", err.message);
      socket.emit("error", { message: "Failed to request ride" });
    }
  });

  // Captain accepts ride - FIXED VERSION
  socket.on("accept-ride", async ({ rideId, captainId }) => {
    console.log(`Captain ${captainId} accepted ride ${rideId}`);

    try {
      // call Redis microservice
      const res = await axios.post(`${REDIS_BACKEND_API_URL}/rides/${rideId}/accept`, { captainId });
      console.log("✅ Redis updated (accept):", res.data);

      // 🔧 FIXED: Get complete ride details from backend and send to rider
      try {
        const rideRes = await axios.get(`${BACKEND_API_URL}/rides/${rideId}`);
        const ride = rideRes.data.data;
        console.log("🔍 Complete ride details for assignment:", ride);
        
        if (ride && ride.customer_id) {
          const riderSocket = riders.get(String(ride.customer_id));
          if (riderSocket) {
            console.log(`📤 Emitting complete ride-assigned to rider ${ride.customer_id} at socket ${riderSocket}`);
            console.log(`📤 All connected riders:`, Object.fromEntries(riders));
            io.to(riderSocket).emit("ride-assigned", ride); // Send complete ride object
            console.log(`✅ Notified rider ${ride.customer_id} about ride assignment with complete details`);
          } else {
            console.log(`⚠️ Rider ${ride.customer_id} not connected, cannot notify`);
            console.log(`⚠️ Available riders:`, Array.from(riders.keys()));
          }
        } else {
          console.log("⚠️ No customer_id found in ride data");
        }
      } catch (rideErr) {
        console.error("❌ Failed to get complete ride details:", rideErr.message);
        // Fallback to simple notification
        const rideRes = await axios.get(`${REDIS_BACKEND_API_URL}/rides/${rideId}`);
        const rideData = rideRes.data;
        const riderId = rideData.customerId;
        
        const riderSocket = riders.get(String(riderId));
        if (riderSocket) {
          io.to(riderSocket).emit("ride-assigned", { rideId, captainId });
          console.log(`✅ Fallback: Notified rider ${riderId} about ride assignment`);
        }
      }
    } catch (err) {
      console.error("❌ Failed to persist accept-ride:", err.message);
      socket.emit("error", { message: "accept-ride failed" });
    }
  });

  // 🚖 Start ride
  socket.on("start-ride", async ({ rideId }) => {
    console.log(`Ride ${rideId} started`);
    try {
      const res = await axios.post(`${REDIS_BACKEND_API_URL}/rides/${rideId}/start`);
      console.log("✅ Redis updated (start):", res.data);
      
      // Get ride details to find the rider
      try {
        const rideRes = await axios.get(`${BACKEND_API_URL}/rides/${rideId}`);
        const ride = rideRes.data.data;
        console.log("🔍 Ride details for start:", ride);
        
        if (ride && ride.customer_id) {
          const riderSocket = riders.get(String(ride.customer_id));
          if (riderSocket) {
            console.log(`📤 Emitting ride-started to rider ${ride.customer_id} at socket ${riderSocket}`);
            console.log(`📤 All connected riders:`, Object.fromEntries(riders));
            io.to(riderSocket).emit("ride-started", { rideId });
            // Also emit a test event to verify connection
            io.to(riderSocket).emit("test-ride-started", { rideId, test: true });
          } else {
            console.log(`⚠️ Rider ${ride.customer_id} not connected for ride-started event`);
            console.log(`⚠️ Available riders:`, Array.from(riders.keys()));
          }
        } else {
          console.log("⚠️ No customer_id found in ride data");
        }
      } catch (rideErr) {
        console.error("❌ Failed to get ride details:", rideErr.message);
        console.log("⚠️ Cannot notify rider about ride start - ride data unavailable");
      }
    } catch (err) {
      console.error("❌ Failed to persist start-ride:", err.message);
      socket.emit("error", { message: "start-ride failed" });
    }
  });

  // 🚖 End ride
  socket.on("end-ride", async ({ rideId }) => {
    console.log(`Ride ${rideId} ended`);

    try {
      // Get ride data from Redis to find riderId BEFORE it's deleted
      const rideRes = await axios.get(`${REDIS_BACKEND_API_URL}/rides/${rideId}`);
      const rideData = rideRes.data;
      const riderId = rideData.customerId;

      // Now end the ride (this will delete it from Redis)
      const res = await axios.post(`${REDIS_BACKEND_API_URL}/rides/${rideId}/end`);
      console.log("✅ Redis updated (end):", res.data);

      // Notify rider about ride completion
      const riderSocket = riders.get(String(riderId));
      if (riderSocket) {
        io.to(riderSocket).emit("ride-completed", { rideId });
        console.log(`✅ Notified rider ${riderId} about ride completion`);
      } else {
        console.log(`⚠️ Rider ${riderId} not connected, cannot notify`);
      }
    } catch (err) {
      console.error("❌ Failed to persist end-ride:", err.message);
      socket.emit("error", { message: "end-ride failed" });
    }
  });

  // Captain sends location
  socket.on("location-update", async ({ rideId, riderId, lat, lng }) => {
    console.log(`🚨 location-update from captain for ride ${rideId}:`, { lat, lng });
    try {
      await axios.post(
        `${BACKEND_API_URL}/rides/${rideId}/location`,
        { lat, lng },
        { headers: { Authorization: `Bearer ${socket.handshake.auth.token}` } }
      );

      // Forward to rider
      const riderSocket = riders.get(riderId);
      if (riderSocket) io.to(riderSocket).emit("captain-location", { lat, lng });
    } catch (err) {
      console.error("❌ Location update failed:", err.message);
    }
  });

  // Ride status updates
  socket.on("ride-status", async ({ rideId, status }) => {
    console.log(`🚨 ride-status update for ride ${rideId}:`, status);
    try {
      // Update status in Redis
      await axios.patch(
        `${REDIS_BACKEND_API_URL}/rides/${rideId}/status`,
        { status }
      );
      console.log("✅ Redis updated (status):", { rideId, status });
      
      // Get ride data to find rider and notify them
      try {
        const rideRes = await axios.get(`${REDIS_BACKEND_API_URL}/rides/${rideId}`);
        const rideData = rideRes.data;
        const riderId = rideData.customerId;
        
        const riderSocket = riders.get(String(riderId));
        if (riderSocket) {
          io.to(riderSocket).emit("ride-status-updated", { rideId, status });
          console.log(`✅ Notified rider ${riderId} about status update`);
        } else {
          console.log(`⚠️ Rider ${riderId} not connected, cannot notify about status update`);
        }
      } catch (rideErr) {
        console.error("❌ Failed to get ride data for status notification:", rideErr.message);
      }
    } catch (err) {
      console.error("❌ Ride status update failed:", err.message);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    [...riders].forEach(([id, sid]) => sid === socket.id && riders.delete(id));
    [...captains].forEach(([id, sid]) => sid === socket.id && captains.delete(id));
  });
});

// Start service
const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 WS Service running on :${PORT}`));
