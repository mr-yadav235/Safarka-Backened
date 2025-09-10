import Redis from "ioredis";
const url = process.env.REDIS_URL || "redis://default:94qTph84isfNO47pVyip0LBY8zMYQNcp@redis-14263.crce206.ap-south-1-1.ec2.redns.redis-cloud.com:14263";
export const redis = new Redis(url);
 
// Keys used
export const GEO_KEY = "captains:geo"; // GEOADD lon lat member
export const LOC_KEY = (captain_id) => `captain:${captain_id}:location`; // JSON for live location