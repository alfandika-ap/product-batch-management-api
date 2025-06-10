import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { jwtConfig } from '../../config/jwt';

export const scanRoutes = new Elysia({ prefix: '/scan' })
  .use(jwt({
    name: 'jwt',
    secret: jwtConfig.secret,
    exp: jwtConfig.expiresIn
  }))
  
  // Main verification endpoint - Can be used anonymously
  .post('/verify', () => ({ 
    success: true, 
    message: 'Product verification completed',
    data: {
      valid: true,
      product: {
        id: 1,
        name: 'Sample Product',
        category: 'Electronics',
        batch_code: 'BATCH001',
        status: 'active'
      },
      scan_count: 1,
      first_scan: true
    }
  }), {
    body: t.Object({
      qr_code: t.String({ minLength: 1, description: 'QR code from product hologram sticker' }),
      pin_code: t.String({ 
        minLength: 6, 
        maxLength: 6, 
        pattern: '^[0-9]{6}$',
        description: '6-digit PIN code'
      }),
      location: t.Optional(t.Object({
        latitude: t.Number(),
        longitude: t.Number()
      })),
      device_info: t.Optional(t.String())
    }),
    detail: {
      summary: 'Verify product authenticity',
      description: 'Main endpoint to verify product authenticity using QR code and PIN. Can be used anonymously for public verification.',
      tags: ['Scan'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['qr_code', 'pin_code'],
              properties: {
                qr_code: { 
                  type: 'string', 
                  description: 'QR code from product hologram sticker',
                  example: 'QR123456789'
                },
                pin_code: { 
                  type: 'string', 
                  pattern: '^[0-9]{6}$',
                  description: '6-digit PIN code',
                  example: '123456'
                },
                location: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number' },
                    longitude: { type: 'number' }
                  }
                },
                device_info: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Verification completed',
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
                      valid: { type: 'boolean' },
                      product: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          name: { type: 'string' },
                          category: { type: 'string' },
                          batch_code: { type: 'string' },
                          status: { type: 'string' }
                        }
                      },
                      scan_count: { type: 'number' },
                      first_scan: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid QR code or PIN'
        },
        404: {
          description: 'Product not found'
        }
      }
    }
  })
  
  // Get item status by QR code
  .get('/status/:qrCode', ({ params }) => ({ 
    success: true, 
    message: 'Item status retrieved successfully',
    data: {
      qr_code: params.qrCode,
      status: 'active',
      scan_count: 5,
      last_scanned: '2024-01-15T10:30:00Z',
      product: {
        name: 'Sample Product',
        category: 'Electronics'
      }
    }
  }), {
    params: t.Object({
      qrCode: t.String()
    }),
    detail: {
      summary: 'Get item status by QR code',
      description: 'Check the current status of a product item using its QR code',
      tags: ['Scan'],
      parameters: [
        {
          name: 'qrCode',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'QR code of the item'
        }
      ],
      responses: {
        200: {
          description: 'Item status retrieved successfully'
        },
        404: {
          description: 'Item not found'
        }
      }
    }
  })
  
  // Protected routes - Scan history (requires authentication)
  .get('/logs/:itemId', () => ({ 
    success: true, 
    message: 'Scan logs retrieved successfully',
    data: [
      {
        id: 1,
        scanned_at: '2024-01-15T10:30:00Z',
        user_id: 123,
        location: { latitude: -6.2088, longitude: 106.8456 },
        ip_address: '192.168.1.1',
        device_info: 'Mozilla/5.0...'
      }
    ]
  }), {
    params: t.Object({
      itemId: t.String()
    }),
    detail: {
      summary: 'Get scan history for item',
      description: 'Retrieve the complete scan history for a specific item (Admin only)',
      tags: ['Scan'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'itemId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Item ID'
        }
      ],
      responses: {
        200: {
          description: 'Scan logs retrieved successfully'
        },
        401: {
          description: 'Unauthorized'
        },
        404: {
          description: 'Item not found'
        }
      }
    }
  })
  
  // Bulk verification for admins
  .post('/bulk-verify', () => ({ 
    success: true, 
    message: 'Bulk verification completed',
    data: {
      verified_count: 10,
      failed_count: 0,
      results: []
    }
  }), {
    body: t.Object({
      items: t.Array(t.Object({
        qr_code: t.String(),
        pin_code: t.String()
      }))
    }),
    detail: {
      summary: 'Bulk verify multiple items',
      description: 'Verify multiple products at once (Admin only)',
      tags: ['Scan'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Bulk verification completed'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  });

export default scanRoutes; 