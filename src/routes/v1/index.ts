import { Elysia } from 'elysia';
import { authRoutes } from './auth.routes';
import { productsRoutes } from './products.routes';
import { batchesRoutes } from './batches.routes';
import { scanRoutes } from './scan.routes';
import { analyticsRoutes } from './analytics.routes';

export const v1Routes = new Elysia({ prefix: '/v1' })
  .use(authRoutes)
  .use(productsRoutes)
  .use(batchesRoutes)
  .use(scanRoutes)
  .use(analyticsRoutes);

export default v1Routes; 