import express from 'express';
import { auth } from '../middleware/auth.js';
import { 
  registerVehicle, 
  getCaptainVehicles, 
  setCurrentVehicle, 
  getCurrentVehicle 
} from '../controllers/vehicles.controller.js';

const router = express.Router();

// Register a new vehicle for a captain
router.post('/register', auth(['captain']), registerVehicle);

// Get all vehicles for the authenticated captain
router.get('/my-vehicles', auth(['captain']), getCaptainVehicles);

// Set current active vehicle
router.post('/set-current', auth(['captain']), setCurrentVehicle);

// Get current active vehicle
router.get('/current', auth(['captain']), getCurrentVehicle);

export default router;
