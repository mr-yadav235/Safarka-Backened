import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

export async function registerUser(data) {
  const hash = await bcrypt.hash(data.password, 10);
  const user = await prisma.User.create({
    data: {
      name: data.name,
      phone_number: data.phone_number,
      email: data.email ?? null,
      password_hash: hash,
    }
  });
  // create wallet by default
  await prisma.Wallet.create({ data: { user_id: user.id, balance: 0 } });
  return user;
}

export async function registerCaptain(data) {
  const hash = await bcrypt.hash(data.password, 10);
  const captain = await prisma.Captain.create({
    data: {
      name: data.name,
      phone_number: data.phone_number,
      email: data.email ?? null,
      password_hash: hash,
      vehicle_type: data.vehicle_type,
      vehicle_number: data.vehicle_number,
      license_number: data.license_number,
    }
  });
  return captain;
}

export async function loginUser({ phone_number, password }) {
  const user = await prisma.User.findUnique({ where: { phone_number } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  const token = jwt.sign({ userId: user.id, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return { token, user };
}

export async function loginCaptain({ phone_number, password }) {
  const captain = await prisma.Captain.findUnique({ where: { phone_number } });
  if (!captain) return null;
  const ok = await bcrypt.compare(password, captain.password_hash);
  if (!ok) return null;
  const token = jwt.sign({ userId: captain.id, role: "captain" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return { token, captain };
}