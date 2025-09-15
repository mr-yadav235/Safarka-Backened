import { redis, GEO_KEY, LOC_KEY, AVAILABILITY_KEY } from "./src/config/redis.js";
import { 
  updateCaptainGeo, 
  findNearbyCaptains, 
  setCaptainAvailability,
  getAllAvailableCaptains,
  getDistanceToCaptain,
  cleanupExpiredCaptains
} from "./src/services/geospatial.service.js";

/**
 * Test script for location-based captain search functionality
 */
async function testLocationSearch() {
  console.log("🚀 Testing Location-Based Captain Search");
  console.log("==========================================");

  try {
    // Test coordinates (Mumbai, India)
    const testLocation = {
      lat: 19.0760,
      lng: 72.8777
    };

    // Simulate some captains in different locations around Mumbai
    const testCaptains = [
      { id: 1, name: "Captain Raj", lat: 19.0760, lng: 72.8777 }, // Same location
      { id: 2, name: "Captain Priya", lat: 19.0800, lng: 72.8800 }, // ~500m away
      { id: 3, name: "Captain Amit", lat: 19.0700, lng: 72.8700 }, // ~1km away
      { id: 4, name: "Captain Sita", lat: 19.1000, lng: 72.9000 }, // ~3km away
      { id: 5, name: "Captain Kumar", lat: 19.0500, lng: 72.8500 }, // ~5km away
    ];

    console.log("\n📍 Setting up test captains...");
    
    // Add captains to geo index and set them as available
    for (const captain of testCaptains) {
      await updateCaptainGeo(captain.id, captain.lng, captain.lat, {
        name: captain.name,
        speed: Math.random() * 50, // Random speed 0-50 km/h
        heading: Math.random() * 360 // Random heading 0-360 degrees
      });
      await setCaptainAvailability(captain.id, true);
      console.log(`✅ Added ${captain.name} at ${captain.lat}, ${captain.lng}`);
    }

    console.log("\n🔍 Testing nearby captain search...");
    
    // Test 1: Find captains within 1km
    console.log("\n--- Test 1: Captains within 1km ---");
    const nearby1km = await findNearbyCaptains(testLocation.lng, testLocation.lat, 1000, 10);
    console.log(`Found ${nearby1km.length} captains within 1km:`, nearby1km);

    // Test 2: Find captains within 3km
    console.log("\n--- Test 2: Captains within 3km ---");
    const nearby3km = await findNearbyCaptains(testLocation.lng, testLocation.lat, 3000, 10);
    console.log(`Found ${nearby3km.length} captains within 3km:`, nearby3km);

    // Test 3: Find captains within 5km
    console.log("\n--- Test 3: Captains within 5km ---");
    const nearby5km = await findNearbyCaptains(testLocation.lng, testLocation.lat, 5000, 10);
    console.log(`Found ${nearby5km.length} captains within 5km:`, nearby5km);

    console.log("\n📏 Testing distance calculations...");
    
    // Test distance calculation for each captain
    for (const captainId of nearby5km) {
      const distance = await getDistanceToCaptain(captainId, testLocation.lng, testLocation.lat);
      console.log(`Captain ${captainId} is ${Math.round(distance)}m away`);
    }

    console.log("\n📋 Testing get all available captains...");
    const allAvailable = await getAllAvailableCaptains();
    console.log(`Total available captains: ${allAvailable.length}`);
    allAvailable.forEach(captain => {
      console.log(`- Captain ${captain.captain_id}: ${captain.lat}, ${captain.lng} (${captain.name})`);
    });

    console.log("\n🧹 Testing cleanup functionality...");
    
    // Make one captain unavailable
    await setCaptainAvailability(1, false);
    console.log("Made Captain 1 unavailable");
    
    // Run cleanup
    const cleanedCount = await cleanupExpiredCaptains();
    console.log(`Cleaned up ${cleanedCount} expired captains`);

    // Check available captains after cleanup
    const afterCleanup = await getAllAvailableCaptains();
    console.log(`Available captains after cleanup: ${afterCleanup.length}`);

    console.log("\n✅ All tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Clean up test data
    console.log("\n🧹 Cleaning up test data...");
    await redis.del(GEO_KEY);
    for (let i = 1; i <= 5; i++) {
      await redis.del(LOC_KEY(i));
      await redis.del(AVAILABILITY_KEY(i));
    }
    console.log("✅ Test data cleaned up");
    
    await redis.disconnect();
  }
}

// Run the test
testLocationSearch().catch(console.error);
