import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

/**
 * Validates a JWT token and returns user information
 * @param {string} token - JWT token to validate
 * @returns {Object} - { isValid: boolean, user: Object|null, error: string|null }
 */
export async function validateToken(token) {
  try {
    if (!token) {
      return { isValid: false, user: null, error: "No token provided" };
    }

    // Verify the JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!payload.userId || !payload.role) {
      return { isValid: false, user: null, error: "Invalid token payload" };
    }

    // Fetch user details from database based on role
    let user = null;
    if (payload.role === "customer") {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          phone_number: true,
          email: true,
          created_at: true,
          updated_at: true
        }
      });
    } else if (payload.role === "captain") {
      user = await prisma.captain.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          phone_number: true,
          email: true,
          license_number: true,
          current_status: true,
          current_vehicle_id: true,
          created_at: true,
          updated_at: true,
          current_vehicle: {
            select: {
              id: true,
              vehicle_type: true,
              make: true,
              model: true,
              year: true,
              color: true,
              plate_number: true,
              capacity: true
            }
          }
        }
      });
    } else if (payload.role === "admin") {
      // For admin, we might have a separate admin table or use a flag
      // For now, we'll return the payload as is
      user = {
        id: payload.userId,
        role: payload.role
      };
    }

    if (!user) {
      return { isValid: false, user: null, error: "User not found" };
    }

    return {
      isValid: true,
      user: {
        ...user,
        role: payload.role
      },
      error: null
    };

  } catch (error) {
    console.error("Token validation error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return { isValid: false, user: null, error: "Token has expired" };
    } else if (error.name === "JsonWebTokenError") {
      return { isValid: false, user: null, error: "Invalid token format" };
    } else {
      return { isValid: false, user: null, error: "Token validation failed" };
    }
  }
}

/**
 * Validates token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {Object} - { isValid: boolean, user: Object|null, error: string|null }
 */
export async function validateAuthHeader(authHeader) {
  if (!authHeader) {
    return { isValid: false, user: null, error: "No authorization header provided" };
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  return await validateToken(token);
}
