import { registerSchema, loginSchema } from "../utils/validation.js";
import { registerUser, loginUser } from "../services/auth.service.js";
import { validateAuthHeader } from "../services/validation.service.js";
import { badRequest, created, ok, unauthorized } from "../utils/responses.js";

export async function register(req, res) {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return badRequest(res, error.message);
  const user = await registerUser(value);
  return created(res, { user });
}

export async function login(req, res) {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return badRequest(res, error.message);
  const result = await loginUser(value);
  if (!result) return unauthorized(res, "Invalid credentials");
  return ok(res, result);
}

export async function validate(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const validation = await validateAuthHeader(authHeader);
    
    if (!validation.isValid) {
      return unauthorized(res, validation.error);
    }
    
    return ok(res, {
      message: "Token is valid",
      user: validation.user
    });
  } catch (error) {
    console.error("Validation endpoint error:", error);
    return unauthorized(res, "Token validation failed");
  }
}