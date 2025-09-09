import jwt from "jsonwebtoken";
import { unauthorized } from "../utils/responses.js";

export const auth = (roles = []) => {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) return unauthorized(res);
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { userId, role }
      if (roles.length && !roles.includes(payload.role)) return unauthorized(res, "Forbidden");
      next();
    } catch (e) {
      return unauthorized(res);
    }
  };
};