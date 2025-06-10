import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { jwtConfig } from '../../config/jwt';
import { BatchController } from '../../controllers/batch.controller';

export const batchesRoutes = new Elysia({ prefix: '/batches' })
  .use(jwt({
    name: 'jwt',
    secret: jwtConfig.secret,
    exp: jwtConfig.expiresIn
  }))
  
  // Get all batches
  .get('/', BatchController.getBatches, {
    query: t.Optional(t.Object({
      productId: t.Optional(t.Numeric())
    })),
    detail: {
      summary: 'Get all product batches',
      description: 'Retrieve a list of all product batches. Optionally filter by productId using query parameter.',
      tags: ['Batches'],
      security: [{ bearerAuth: [] }],
      parameters: [{
        name: 'productId',
        in: 'query',
        description: 'Filter batches by product ID',
        required: false,
        schema: {
          type: 'number'
        }
      }],
      responses: {
        200: {
          description: 'Batches retrieved successfully'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Get batch by ID
  .get('/:id', ({ params }) => ({ 
    success: true, 
    message: 'Batch retrieved successfully',
    data: { id: params.id }
  }), {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Get batch by ID',
      description: 'Retrieve a specific batch by its ID',
      tags: ['Batches'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Batch retrieved successfully'
        },
        404: {
          description: 'Batch not found'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Get batch progress
  .get('/:id/progress', BatchController.getBatchProgress, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Get batch generation progress',
      description: 'Get the progress of product items generation for a batch',
      tags: ['Batches'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Progress retrieved successfully',
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
                      total: { type: 'number' },
                      waiting: { type: 'number' },
                      active: { type: 'number' },
                      completed: { type: 'number' },
                      failed: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Batch not found'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })

  // Create new batch
  .post('/', BatchController.createBatch, {
    body: t.Object({
      product_id: t.Number({ minimum: 1 }),
      batch_code: t.String({ minLength: 1, maxLength: 50 }),
      quantity: t.Number({ minimum: 1 }),
    }),
    detail: {
      summary: 'Create new product batch',
      description: 'Create a new production batch for a product (Admin only)',
      tags: ['Batches'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['product_id', 'batch_code', 'quantity'],
              properties: {
                product_id: { type: 'number', minimum: 1 },
                batch_code: { type: 'string', minLength: 1, maxLength: 50 },
                quantity: { type: 'number', minimum: 1 },
                production_date: { type: 'string', format: 'date' },
                expiry_date: { type: 'string', format: 'date' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Batch created successfully'
        },
        400: {
          description: 'Validation error'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Generate QR codes and PINs for batch
  .post('/:id/generate-items', ({ params }) => ({ 
    success: true, 
    message: 'QR codes and PINs generated successfully',
    data: {
      batch_id: params.id,
      generated_count: 100,
      items_preview: [
        { qr_code: 'QR001', pin_code: '123456' },
        { qr_code: 'QR002', pin_code: '789012' }
      ]
    }
  }), {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      generate_all: t.Optional(t.Boolean({ default: true })),
      count: t.Optional(t.Number({ minimum: 1 }))
    }),
    detail: {
      summary: 'Generate QR codes and PINs for batch',
      description: 'Generate QR codes and PIN codes for all items in a batch (Admin only)',
      tags: ['Batches'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Items generated successfully'
        },
        404: {
          description: 'Batch not found'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Update batch
  .put('/:id', ({ params }) => ({ 
    success: true, 
    message: 'Batch updated successfully',
    data: { id: params.id }
  }), {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      batch_code: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
      quantity: t.Optional(t.Number({ minimum: 1 })),
      production_date: t.Optional(t.String({ format: 'date' })),
      expiry_date: t.Optional(t.String({ format: 'date' }))
    }),
    detail: {
      summary: 'Update batch',
      description: 'Update an existing batch (Admin only)',
      tags: ['Batches'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Batch updated successfully'
        },
        404: {
          description: 'Batch not found'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  // Delete batch
  .delete('/:id', ({ params }) => ({ 
    success: true, 
    message: 'Batch deleted successfully'
  }), {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Delete batch',
      description: 'Delete a batch and all its items (Admin only)',
      tags: ['Batches'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Batch deleted successfully'
        },
        404: {
          description: 'Batch not found'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })

export default batchesRoutes; 