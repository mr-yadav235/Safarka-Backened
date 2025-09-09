import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { confirmPayment, initiatePayment } from "../controllers/payments.controller.js";
const r = Router();
r.post("/initiate", auth(), initiatePayment);
r.post("/confirm", auth(), confirmPayment);
export default r;