import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { AuthController } from '../../controllers/auth.controller';
import { createAuthMiddleware, requireAdmin, createOptionalAuthMiddleware } from '../../middleware/auth.middleware';
import { jwtConfig } from '../../config/jwt';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwt({
    name: 'jwt',
    secret: jwtConfig.secret,
    exp: jwtConfig.expiresIn
  }))
  
  // Public routes
  .post('/register', AuthController.register, {
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 255, default: "Alfandika" }),
      email: t.String({ format: 'email', default: "dikalfan@gmail.com" }),
      password: t.String({ minLength: 8, default: "mendol123" }),
      confirmPassword: t.String({ default: "mendol123" })
    }),
    detail: {
      summary: 'Register new user',
      tags: ['Authentication'],
      responses: {
        200: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      user: { type: 'object' },
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error'
        }
      }
    }
  })
  
  .post('/login', AuthController.login, {
    body: t.Object({
      email: t.String({ format: 'email', default: "dikalfan@gmail.com" }),
      password: t.String({ minLength: 6, default: "mendol123" })
    }),
    detail: {
      summary: 'Login user',
      tags: ['Authentication']
    }
  })
  
  .post('/refresh', AuthController.refreshToken, {
    body: t.Object({
      refreshToken: t.String()
    }),
    detail: {
      summary: 'Refresh access token',
      tags: ['Authentication']
    }
  })
  
  // Protected routes
  .derive(async (context) => {
    const middleware = createAuthMiddleware();
    const result = await middleware(context as any);
    if (result) {
      throw new Error(JSON.stringify(result));
    }
    return {};
  })
  
  .get('/profile', AuthController.getProfile, {
    detail: {
      summary: 'Get current user profile',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }]
    }
  })
  
  .post('/change-password', AuthController.changePassword, {
    body: t.Object({
      currentPassword: t.String(),
      newPassword: t.String({ minLength: 8 }),
      confirmPassword: t.String()
    }),
    detail: {
      summary: 'Change user password',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }]
    }
  })
  
  .post('/logout', AuthController.logout, {
    detail: {
      summary: 'Logout user',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }]
    }
  })
  
  .delete('/deactivate', AuthController.deactivateAccount, {
    detail: {
      summary: 'Deactivate user account',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }]
    }
  });

export default authRoutes; 