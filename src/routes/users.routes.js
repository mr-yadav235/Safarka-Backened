import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { getUser, getUserRides } from "../controllers/users.controller.js";
const r = Router();
r.get("/:id", auth(), getUser);
r.get("/:id/rides", auth(), getUserRides);
export default r;