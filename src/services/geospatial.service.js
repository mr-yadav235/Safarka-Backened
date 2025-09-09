import { redis, GEO_KEY, LOC_KEY } from "../config/redis.js";

export async function setCaptainAvailability(captainId, available) {
  if (!available) {
    // remove from GEO set when offline
    await redis.zrem(GEO_KEY, captainId.toString());
  } else {
    const raw = await redis.get(LOC_KEY(captainId));
    if (raw) {
      const { lat, lng } = JSON.parse(raw);
      await redis.geoadd(GEO_KEY, lng, lat, captainId.toString());
    }
  }
}

export async function updateCaptainGeo(captainId, lng, lat) {
  // GEOADD expects lon lat
  await redis.geoadd(GEO_KEY, lng, lat, captainId.toString());
  await redis.set(LOC_KEY(captainId), JSON.stringify({ lat, lng, timestamp: Date.now() }));
}

export async function findNearbyCaptains(lng, lat, radiusMeters = 3000, count = 10) {
  // GEORADIUS is deprecated; use GEOSEARCH in new Redis. ioredis supports GEOSEARCH.
  const members = await redis.geosearch(GEO_KEY, "FROMLONLAT", lng, lat, "BYRADIUS", radiusMeters, "m", "ASC", "COUNT", count);
  return members.map((m) => parseInt(m, 10));
}

export async function getCaptainLiveLocation(captainId) {
  const raw = await redis.get(LOC_KEY(captainId));
  return raw ? JSON.parse(raw) : null;
}