import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  phone_number: Joi.string().min(8).required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("customer", "admin").required()
});

export const loginSchema = Joi.object({
  phone_number: Joi.string().required(),
  password: Joi.string().required()
});


export const captainRegisterSchema = Joi.object({
  name: Joi.string().min(2).required(),
  phone_number: Joi.string().min(8).required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).required(),
  vehicle_type: Joi.string().valid("bike", "auto", "car").required(),
  vehicle_number: Joi.string().required(),
  license_number: Joi.string().required()
});

export const rideRequestSchema = Joi.object({
  customer_id: Joi.number().required(),
  pickup_lat: Joi.number().required(),
  pickup_lng: Joi.number().required(),
  drop_lat: Joi.number().required(),
  drop_lng: Joi.number().required(),
  pickup: Joi.string().required(),
  dropoff: Joi.string().required()
});