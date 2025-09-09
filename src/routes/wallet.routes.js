import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { getWallet, topup } from "../controllers/wallet.controller.js";
const r = Router();
r.get("/:userId", auth(), getWallet);
r.post("/:userId/topup", auth(), topup);
export default r;