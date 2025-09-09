import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: '94qTph84isfNO47pVyip0LBY8zMYQNcp',
    socket: {
        host: 'redis-14263.crce206.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 14263
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

await client.set('foo', 'bar');
const result = await client.get('foo');
console.log(result)  // >>> bar

