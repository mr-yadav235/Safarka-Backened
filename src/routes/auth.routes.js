import { Router } from "express";
import { login, register, validate } from "../controllers/auth.controller.js";
const r = Router();
r.post("/register", register);
r.post("/login", login);
r.get("/validate", validate);
export default r;