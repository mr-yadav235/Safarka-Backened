import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { createTicket, updateTicket } from "../controllers/support.controller.js";
const r = Router();
r.post("/", auth(), createTicket);
r.patch("/:ticketId", auth(["admin"]), updateTicket);
export default r;