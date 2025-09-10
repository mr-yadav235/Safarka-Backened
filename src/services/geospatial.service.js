import { redis, GEO_KEY, LOC_KEY } from "../config/redis.js";

export async function setCaptainAvailability(captain_id, available) {
  if (!available) {
    // remove from GEO set when offline
    await redis.zrem(GEO_KEY, captain_id.toString());
  } else {
    const raw = await redis.get(LOC_KEY(captain_id));
    if (raw) {
      const { lat, lng } = JSON.parse(raw);
      await redis.geoadd(GEO_KEY, lng, lat, captain_id.toString());
    }
  }
}

export async function updateCaptainGeo(captain_id, lng, lat) {
  // GEOADD expects lon lat
  await redis.geoadd(GEO_KEY, lng, lat, captain_id.toString());
  await redis.set(LOC_KEY(captain_id), JSON.stringify({ lat, lng, timestamp: Date.now() }));
}

export async function findNearbyCaptains(lng, lat, radiusMeters = 3000, count = 10) {
  // GEORADIUS is deprecated; use GEOSEARCH in new Redis. ioredis supports GEOSEARCH.
  const members = await redis.geosearch(GEO_KEY, "FROMLONLAT", lng, lat, "BYRADIUS", radiusMeters, "m", "ASC", "COUNT", count);
  return members.map((m) => parseInt(m, 10));
}

export async function getCaptainLiveLocation(captain_id) {
  const raw = await redis.get(LOC_KEY(captain_id));
  return raw ? JSON.parse(raw) : null;
}