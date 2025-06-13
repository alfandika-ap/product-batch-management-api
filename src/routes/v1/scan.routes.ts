import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { jwtConfig } from '../../config/jwt';
import { ScanQrController } from '../../controllers/scanqr.controller';

export const scanRoutes = new Elysia({ prefix: '/scan' })
  .use(jwt({
    name: 'jwt',
    secret: jwtConfig.secret,
    exp: jwtConfig.expiresIn
  }))
  
  .post('/', ScanQrController.scanQrCode, {
    body: t.Object({
      qrCode: t.Optional(t.String()),
      serialNumber: t.Optional(t.String())
    }),
    detail: {
      summary: "Scan QR code",
      description: "Scan QR code to get product details",
      tags: ["Scan"],
      security: [{ bearerAuth: [] }],
    }
  });

export default scanRoutes; 