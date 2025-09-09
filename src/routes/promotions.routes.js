import { Router } from "express";
import { listPromos, applyPromo } from "../controllers/promotions.controller.js";
const r = Router();
r.get("/", listPromos);
r.post("/apply", applyPromo);
export default r;