# Location-Based Captain Search API

This document describes the enhanced location-based captain search functionality using Redis GEO indexing.

## Overview

The system uses Redis GEO commands to efficiently index and search for nearby captains based on their real-time locations. This provides fast, accurate, and scalable location-based matching for ride requests.

## Key Features

- **Real-time Location Tracking**: Captains update their location via heartbeat API
- **Redis GEO Indexing**: Fast spatial queries using Redis GEO commands
- **Availability Management**: TTL-based availability tracking
- **Distance Calculations**: Accurate distance calculations between points
- **Automatic Cleanup**: Periodic cleanup of expired captain data

## API Endpoints

### 1. Captain Location Management

#### Update Captain Location (Heartbeat)
```http
POST /captains/:id/heartbeat
Authorization: Bearer <captain_token>
Content-Type: application/json

{
  "lat": 19.0760,
  "lng": 72.8777,
  "speed": 25.5,
  "heading": 180,
  "accuracy": 5.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "captain_id": 1,
    "lat": 19.0760,
    "lng": 72.8777,
    "timestamp": 1699123456789,
    "speed": 25.5,
    "heading": 180,
    "accuracy": 5.0
  }
}
```

#### Go Online
```http
POST /captains/me/online
Authorization: Bearer <captain_token>
Content-Type: application/json

{
  "lat": 19.0760,
  "lng": 72.8777
}
```

#### Go Offline
```http
POST /captains/me/offline
Authorization: Bearer <captain_token>
```

### 2. Location-Based Search

#### Find Nearby Captains
```http
GET /captains/nearby?lat=19.0760&lng=72.8777&radius=3000&count=10
```

**Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude  
- `radius` (optional): Search radius in meters (default: 3000)
- `count` (optional): Maximum number of captains to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Captain Raj",
      "phone_number": "+919876543210",
      "vehicle_type": "sedan",
      "vehicle_number": "MH01AB1234"
    }
  ]
}
```

#### Get All Available Captains with Locations
```http
GET /captains/available
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "captains": [
      {
        "id": 1,
        "name": "Captain Raj",
        "phone_number": "+919876543210",
        "vehicle_type": "sedan",
        "vehicle_number": "MH01AB1234",
        "current_status": "available",
        "location": {
          "lat": 19.0760,
          "lng": 72.8777,
          "timestamp": 1699123456789,
          "speed": 25.5,
          "heading": 180,
          "accuracy": 5.0
        }
      }
    ],
    "count": 1,
    "timestamp": 1699123456789
  }
}
```

#### Find Available Captains for Ride Request
```http
GET /rides/captains?lat=19.0760&lng=72.8777&radius=5000&count=10
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "captains": [
      {
        "id": 1,
        "name": "Captain Raj",
        "phone_number": "+919876543210",
        "vehicle_type": "sedan",
        "vehicle_number": "MH01AB1234",
        "current_status": "available",
        "distance": 250
      }
    ],
    "count": 1
  }
}
```

## Redis Data Structure

### Keys Used

1. **`captains:geo`** - Redis GEO set containing captain locations
2. **`captain:{id}:location`** - JSON data with detailed location information
3. **`captain:{id}:available`** - TTL-based availability flag (5-minute TTL)

### Data Flow

1. **Captain Goes Online**: 
   - Updates database status to "available"
   - Adds location to Redis GEO set
   - Sets availability flag with TTL

2. **Location Updates**:
   - Updates Redis GEO set with new coordinates
   - Stores detailed location data
   - Refreshes availability TTL

3. **Search Process**:
   - Uses Redis GEOSEARCH to find nearby captains
   - Filters by availability using TTL flags
   - Returns sorted results by distance

4. **Cleanup Process**:
   - Runs every 5 minutes
   - Removes expired captains from GEO set
   - Maintains data integrity

## Performance Characteristics

- **Search Time**: O(log N + M) where N is total captains, M is results
- **Memory Usage**: ~50 bytes per captain in Redis
- **Scalability**: Supports thousands of concurrent captains
- **Accuracy**: Sub-meter precision for distance calculations

## Error Handling

The system includes comprehensive error handling:

- **Invalid Coordinates**: Validates lat/lng ranges
- **Redis Connection**: Graceful fallback if Redis unavailable
- **Data Consistency**: Automatic cleanup of stale data
- **Rate Limiting**: Prevents excessive location updates

## Monitoring and Maintenance

### Health Checks
- Redis connection status
- GEO index size
- Active captain count
- Cleanup service status

### Metrics to Monitor
- Average search response time
- Number of available captains
- Location update frequency
- Cleanup operations performed

## Testing

Run the test script to verify functionality:

```bash
cd safarka-backend
node testLocationSearch.js
```

This will test:
- Captain location indexing
- Nearby search functionality
- Distance calculations
- Availability management
- Cleanup operations

## Best Practices

1. **Location Update Frequency**: Update every 10-30 seconds for optimal balance
2. **Search Radius**: Use appropriate radius based on city density
3. **TTL Management**: 5-minute TTL works well for most use cases
4. **Error Handling**: Always handle Redis connection failures gracefully
5. **Monitoring**: Monitor Redis memory usage and search performance
