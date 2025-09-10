import jwt from "jsonwebtoken";
import { unauthorized } from "../utils/responses.js";

export const auth = (roles = []) => {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      
      console.log("Auth middleware - Header:", header);
      console.log("Auth middleware - Token:", token ? "Present" : "Missing");
      console.log("Auth middleware - Required roles:", roles);
      
      if (!token) {
        console.log("Auth middleware - No token provided");
        return unauthorized(res, "No token provided");
      }
      
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Auth middleware - Decoded payload:", payload);
      
      req.user = payload; // { userId, role }
      
      if (roles.length && !roles.includes(payload.role)) {
        console.log(`Auth middleware - Role mismatch. User role: ${payload.role}, Required: ${roles.join(', ')}`);
        return unauthorized(res, `Forbidden. Required roles: ${roles.join(', ')}`);
      }
      
      console.log("Auth middleware - Authentication successful");
      next();
    } catch (e) {
      console.log("Auth middleware - Token verification failed:", e.message);
      return unauthorized(res, "Invalid token");
    }
  };
};