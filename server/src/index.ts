import fastify from 'fastify';
import cors from '@fastify/cors';
import { initDB } from './db';
import { weatherRoutes } from './routes/weather';

const server = fastify({ logger: true });

server.register(cors, {
    origin: true // Allow all for dev
});

// Register Routes
server.register(weatherRoutes, { prefix: '/api/weather' });

server.get('/health', async () => {
    return { status: 'ok' };
});

const start = async () => {
    try {
        await initDB(); // Ensure tables exist
        await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server running on http://localhost:3000');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
