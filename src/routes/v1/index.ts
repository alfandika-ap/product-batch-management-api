import { Elysia, t } from 'elysia';
import { authRoutes } from './auth.routes';
import { productsRoutes } from './products.routes';
import { batchesRoutes } from './batches.routes';
import { scanRoutes } from './scan.routes';
import { analyticsRoutes } from './analytics.routes';
import { BatchController } from '../../controllers/batch.controller';

export const v1Routes = new Elysia({ prefix: '/v1' })
  .use(authRoutes)
  .use(productsRoutes)
  .use(batchesRoutes)
  .use(scanRoutes)
  .use(analyticsRoutes)
  
  // Download file with token validation (at v1 level)
  .get("/downloads/:filename", BatchController.downloadFile, {
    params: t.Object({
      filename: t.String(),
    }),
    query: t.Object({
      token: t.String(),
    }),
  });

export default v1Routes; 