import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { getUserRatings, giveRating } from "../controllers/ratings.controller.js";
const r = Router();
r.post("/rides/:rideId", auth(), giveRating);
r.get("/users/:id", getUserRatings);
export default r;