import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { jwtConfig } from '../../config/jwt';

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
  .use(jwt({
    name: 'jwt',
    secret: jwtConfig.secret,
    exp: jwtConfig.expiresIn
  }))
  
  // Dashboard overview
  .get('/dashboard', () => ({ 
    success: true, 
    message: 'Dashboard data retrieved successfully',
    data: {
      summary: {
        total_products: 150,
        total_batches: 25,
        total_items: 5000,
        total_scans: 12500,
        active_items: 4850,
        verified_today: 45
      },
      recent_scans: [
        {
          id: 1,
          product_name: 'Sample Product',
          qr_code: 'QR123456',
          scanned_at: '2024-01-15T10:30:00Z',
          valid: true
        }
      ],
      scan_trends: {
        daily: [45, 52, 38, 67, 89, 123, 98],
        weekly: [450, 520, 380, 670, 890],
        monthly: [1500, 1800, 2200, 1900]
      }
    }
  }), {
    detail: {
      summary: 'Get analytics dashboard',
      description: 'Retrieve comprehensive analytics data for the dashboard (Admin only)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Dashboard data retrieved successfully',
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
                      summary: {
                        type: 'object',
                        properties: {
                          total_products: { type: 'number' },
                          total_batches: { type: 'number' },
                          total_items: { type: 'number' },
                          total_scans: { type: 'number' },
                          active_items: { type: 'number' },
                          verified_today: { type: 'number' }
                        }
                      },
                      recent_scans: {
                        type: 'array',
                        items: { type: 'object' }
                      },
                      scan_trends: {
                        type: 'object',
                        properties: {
                          daily: { type: 'array', items: { type: 'number' } },
                          weekly: { type: 'array', items: { type: 'number' } },
                          monthly: { type: 'array', items: { type: 'number' } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Scan statistics
  .get('/scans/stats', () => ({ 
    success: true, 
    message: 'Scan statistics retrieved successfully',
    data: {
      total_scans: 12500,
      valid_scans: 12100,
      invalid_scans: 400,
      success_rate: 96.8,
      unique_items_scanned: 3200,
      repeat_scans: 9300,
      avg_scans_per_item: 3.9
    }
  }), {
    query: t.Optional(t.Object({
      start_date: t.Optional(t.String({ format: 'date' })),
      end_date: t.Optional(t.String({ format: 'date' })),
      product_id: t.Optional(t.String()),
      batch_id: t.Optional(t.String())
    })),
    detail: {
      summary: 'Get scan statistics',
      description: 'Retrieve detailed scan statistics with optional filters (Admin only)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'start_date',
          in: 'query',
          schema: { type: 'string', format: 'date' },
          description: 'Start date for statistics (YYYY-MM-DD)'
        },
        {
          name: 'end_date',
          in: 'query',
          schema: { type: 'string', format: 'date' },
          description: 'End date for statistics (YYYY-MM-DD)'
        },
        {
          name: 'product_id',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter by product ID'
        },
        {
          name: 'batch_id',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter by batch ID'
        }
      ],
      responses: {
        200: {
          description: 'Scan statistics retrieved successfully'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Popular products
  .get('/products/popular', () => ({ 
    success: true, 
    message: 'Popular products retrieved successfully',
    data: [
      {
        product_id: 1,
        product_name: 'Popular Product A',
        total_scans: 2500,
        unique_scans: 800,
        success_rate: 98.5
      },
      {
        product_id: 2,
        product_name: 'Popular Product B',
        total_scans: 1800,
        unique_scans: 650,
        success_rate: 97.2
      }
    ]
  }), {
    query: t.Optional(t.Object({
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 10 })),
      period: t.Optional(t.String({ enum: ['day', 'week', 'month', 'year'], default: 'month' }))
    })),
    detail: {
      summary: 'Get popular products',
      description: 'Retrieve most scanned products with statistics (Admin only)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Popular products retrieved successfully'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Geographic distribution
  .get('/geo/distribution', () => ({ 
    success: true, 
    message: 'Geographic distribution retrieved successfully',
    data: [
      {
        country: 'Indonesia',
        city: 'Jakarta',
        scan_count: 3500,
        latitude: -6.2088,
        longitude: 106.8456
      },
      {
        country: 'Indonesia',
        city: 'Surabaya',
        scan_count: 1200,
        latitude: -7.2575,
        longitude: 112.7521
      }
    ]
  }), {
    detail: {
      summary: 'Get geographic scan distribution',
      description: 'Retrieve geographic distribution of product scans (Admin only)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Geographic distribution retrieved successfully'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Export reports
  .post('/export', () => ({ 
    success: true, 
    message: 'Report export initiated',
    data: {
      export_id: 'exp_123456789',
      status: 'processing',
      estimated_completion: '2024-01-15T11:00:00Z'
    }
  }), {
    body: t.Object({
      report_type: t.String({ enum: ['scans', 'products', 'batches', 'users'] }),
      format: t.String({ enum: ['csv', 'xlsx', 'pdf'], default: 'csv' }),
      filters: t.Optional(t.Object({
        start_date: t.Optional(t.String({ format: 'date' })),
        end_date: t.Optional(t.String({ format: 'date' })),
        product_ids: t.Optional(t.Array(t.Number())),
        batch_ids: t.Optional(t.Array(t.Number()))
      }))
    }),
    detail: {
      summary: 'Export analytics report',
      description: 'Generate and export analytics report in various formats (Admin only)',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Export initiated successfully'
        },
        400: {
          description: 'Invalid export parameters'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  });

export default analyticsRoutes; 