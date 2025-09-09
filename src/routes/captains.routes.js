import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { captainLogin, goOffline, goOnline, heartbeat, myEarnings, myTrips, nearby, registerCaptain, updateStatus } from "../controllers/captains.controller.js";
const r = Router();
r.post("/login", captainLogin);
r.post("/register", registerCaptain);
r.patch("/:id/status", auth(["captain","admin"]), updateStatus);
r.get("/nearby", nearby); // public for demo
r.post("/:id/heartbeat", auth(["captain"]), heartbeat);
r.get("/me/trips", auth(["captain"]), myTrips);
r.get("/me/earnings", auth(["captain"]), myEarnings);
r.post("/me/online", auth(["captain"]), goOnline);
r.post("/me/offline", auth(["captain"]), goOffline);
export default r;