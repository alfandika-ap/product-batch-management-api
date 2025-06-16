import { Elysia } from "elysia";
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { apiRoutes } from './routes';

const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'Carabao Product Management API',
        description: 'Product Authentication System with Hologram Stickers and QR-code + PIN verification',
        version: '1.0.0',
        contact: {
          name: 'Carabao Product Management',
          email: 'support@carabao.com'
        }
      },
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication endpoints'
        },
        {
          name: 'Products', 
          description: 'Product management endpoints'
        },
        {
          name: 'Batches',
          description: 'Product batch management'
        },
        {
          name: 'Items',
          description: 'Individual product items with QR codes'
        },
        {
          name: 'Scan',
          description: 'Product verification and scanning'
        },
        {
          name: 'Analytics',
          description: 'Dashboard and analytics endpoints'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  }))
  .use(cors({
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }))
  .get("/", () => ({
    success: true,
    message: "Carabao Product Management API",
    version: "1.0.0",
    endpoints: {
      api: "/api/v1",
      docs: "/swagger"
    }
  }))
  .use(apiRoutes)
  .listen({
    hostname: "127.0.0.1",
    port: Number(process.env.PORT) || 3001
  });

console.log(
  `🦊 Carabao Product Management API is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📚 API Documentation available at http://${app.server?.hostname}:${app.server?.port}/swagger`
);
