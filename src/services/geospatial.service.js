import { redis, GEO_KEY, LOC_KEY, AVAILABILITY_KEY } from "../config/redis.js";

/**
 * Set captain availability status and manage their presence in the geo index
 * @param {number} captain_id - Captain ID
 * @param {boolean} available - Whether captain is available
 * @param {number} lng - Longitude (optional, for going online)
 * @param {number} lat - Latitude (optional, for going online)
 */
export async function setCaptainAvailability(captain_id, available, lng = null, lat = null) {
  const captainIdStr = captain_id.toString();
  
  if (!available) {
    // Remove from GEO set when offline
    await redis.zrem(GEO_KEY, captainIdStr);
    await redis.del(AVAILABILITY_KEY(captain_id));
    console.log(`Captain ${captain_id} marked as offline`);
  } else {
    // Add to availability set
    await redis.setex(AVAILABILITY_KEY(captain_id), 300, "available"); // 5 min TTL
    
    // If location provided, add to geo index
    if (lng !== null && lat !== null) {
      await redis.geoadd(GEO_KEY, lng, lat, captainIdStr);
      await redis.set(LOC_KEY(captain_id), JSON.stringify({ 
        lat, 
        lng, 
        timestamp: Date.now(),
        status: "available"
      }));
      console.log(`Captain ${captain_id} marked as available at ${lat}, ${lng}`);
    } else {
      // Check if captain has existing location
      const raw = await redis.get(LOC_KEY(captain_id));
      if (raw) {
        const { lat: existingLat, lng: existingLng } = JSON.parse(raw);
        await redis.geoadd(GEO_KEY, existingLng, existingLat, captainIdStr);
        console.log(`Captain ${captain_id} restored to geo index with existing location`);
      }
    }
  }
}

/**
 * Update captain's geographical location
 * @param {number} captain_id - Captain ID
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {object} additionalData - Additional data to store with location
 */
export async function updateCaptainGeo(captain_id, lng, lat, additionalData = {}) {
  const captainIdStr = captain_id.toString();
  
  // Validate coordinates
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new Error("Invalid coordinates provided");
  }
  
  // Update geo index (GEOADD expects lon lat)
  await redis.geoadd(GEO_KEY, lng, lat, captainIdStr);
  
  // Store detailed location data
  const locationData = {
    lat,
    lng,
    timestamp: Date.now(),
    status: "available",
    ...additionalData
  };
  
  await redis.set(LOC_KEY(captain_id), JSON.stringify(locationData));
  
  // Refresh availability TTL
  await redis.setex(AVAILABILITY_KEY(captain_id), 300, "available");
  
  console.log(`Updated location for captain ${captain_id}: ${lat}, ${lng}`);
}

/**
 * Find nearby available captains using Redis GEO
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {number} radiusMeters - Search radius in meters
 * @param {number} count - Maximum number of captains to return
 * @returns {Promise<Array<number>>} Array of captain IDs
 */
export async function findNearbyCaptains(lng, lat, radiusMeters = 3000, count = 10) {
  try {
    // Validate coordinates
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error("Invalid coordinates provided");
    }
    
    // Use GEOSEARCH for better performance (Redis 6.2+)
    const members = await redis.geosearch(
      GEO_KEY, 
      "FROMLONLAT", lng, lat, 
      "BYRADIUS", radiusMeters, "m", 
      "ASC", 
      "COUNT", count
    );
    
    const captainIds = members.map((m) => parseInt(m, 10));
    
    // Filter by availability (double-check with availability set)
    const availableCaptains = [];
    for (const captainId of captainIds) {
      const isAvailable = await redis.get(AVAILABILITY_KEY(captainId));
      if (isAvailable) {
        availableCaptains.push(captainId);
      }
    }
    
    console.log(`Found ${availableCaptains.length} available captains within ${radiusMeters}m of ${lat}, ${lng}`);
    return availableCaptains;
    
  } catch (error) {
    console.error("Error finding nearby captains:", error);
    return [];
  }
}

/**
 * Get captain's live location data
 * @param {number} captain_id - Captain ID
 * @returns {Promise<object|null>} Location data or null
 */
export async function getCaptainLiveLocation(captain_id) {
  try {
    const raw = await redis.get(LOC_KEY(captain_id));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(`Error getting location for captain ${captain_id}:`, error);
    return null;
  }
}

/**
 * Get distance between two points using Redis GEO
 * @param {number} captain_id - Captain ID
 * @param {number} lng - Target longitude
 * @param {number} lat - Target latitude
 * @returns {Promise<number|null>} Distance in meters or null
 */
export async function getDistanceToCaptain(captain_id, lng, lat) {
  try {
    // Get captain's current location
    const captainLocation = await getCaptainLiveLocation(captain_id);
    if (!captainLocation) {
      return null;
    }
    
    // Use Redis GEODIST to calculate distance
    const distance = await redis.geodist(GEO_KEY, captain_id.toString(), `${lng},${lat}`, "m");
    return distance ? parseFloat(distance) : null;
  } catch (error) {
    console.error(`Error getting distance to captain ${captain_id}:`, error);
    return null;
  }
}

/**
 * Get all available captains with their locations
 * @returns {Promise<Array>} Array of captain location data
 */
export async function getAllAvailableCaptains() {
  try {
    const members = await redis.zrange(GEO_KEY, 0, -1);
    const captains = [];
    
    for (const captainId of members) {
      const isAvailable = await redis.get(AVAILABILITY_KEY(captainId));
      if (isAvailable) {
        const location = await getCaptainLiveLocation(parseInt(captainId));
        if (location) {
          captains.push({
            captain_id: parseInt(captainId),
            ...location
          });
        }
      }
    }
    
    return captains;
  } catch (error) {
    console.error("Error getting all available captains:", error);
    return [];
  }
}

/**
 * Clean up expired captain data
 */
export async function cleanupExpiredCaptains() {
  try {
    const members = await redis.zrange(GEO_KEY, 0, -1);
    const expiredCaptains = [];
    
    for (const captainId of members) {
      const isAvailable = await redis.get(AVAILABILITY_KEY(captainId));
      if (!isAvailable) {
        expiredCaptains.push(captainId);
      }
    }
    
    if (expiredCaptains.length > 0) {
      await redis.zrem(GEO_KEY, ...expiredCaptains);
      console.log(`Cleaned up ${expiredCaptains.length} expired captains from geo index`);
    }
    
    return expiredCaptains.length;
  } catch (error) {
    console.error("Error cleaning up expired captains:", error);
    return 0;
  }
}