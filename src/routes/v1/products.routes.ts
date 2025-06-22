import { jwt } from '@elysiajs/jwt';
import { Elysia, t } from 'elysia';
import { jwtConfig } from '../../config/jwt';
import { ProductController } from '../../controllers/product.controller';

export const productsRoutes = new Elysia({ prefix: '/products' })
  .use(jwt({
    name: 'jwt',
    secret: jwtConfig.secret,
    exp: jwtConfig.expiresIn
  }))
  
  // Public routes - Get products
  .get('/', ProductController.getProducts, {
    query: t.Optional(t.Object({
      page: t.Optional(t.Numeric({ minimum: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 }))
    })),
    detail: {
      summary: 'Get all products',
      description: 'Retrieve a paginated list of all products in the catalog',
      tags: ['Products'],
      parameters: [
        {
          name: 'page',
          in: 'query',
          description: 'Page number (default: 1)',
          required: false,
          schema: { type: 'number', minimum: 1, default: 1 }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page (default: 10, max: 100)',
          required: false,
          schema: { type: 'number', minimum: 1, maximum: 100, default: 10 }
        }
      ],
      responses: {
        200: {
          description: 'Products retrieved successfully',
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
                      products: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'number' },
                            name: { type: 'string' },
                            category: { type: 'string' },
                            image_url: { type: 'string' },
                            description: { type: 'string' },
                            created_at: { type: 'string', format: 'date-time' }
                          }
                        }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          currentPage: { type: 'number' },
                          totalPages: { type: 'number' },
                          totalItems: { type: 'number' },
                          itemsPerPage: { type: 'number' },
                          hasNextPage: { type: 'boolean' },
                          hasPreviousPage: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid pagination parameters'
        }
      }
    }
  })
  
  .get('/:id', ProductController.getProductById, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Get product by ID',
      description: 'Retrieve a specific product by its ID',
      tags: ['Products'],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Product ID'
        }
      ],
      responses: {
        200: {
          description: 'Product retrieved successfully'
        },
        404: {
          description: 'Product not found'
        }
      }
    }
  })
  
  // Protected routes - Create/Update/Delete products (Admin only)
  .post('/', ProductController.createProduct, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      category: t.String({ minLength: 1, maxLength: 100 }),
      imageUrl: t.Optional(t.String()),
      description: t.Optional(t.String())
    }),
    detail: {
      summary: 'Create new product',
      description: 'Create a new product in the catalog (Admin only)',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'category'],
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 255 },
                category: { type: 'string', minLength: 1, maxLength: 100 },
                imageUrl: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Product created successfully'
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
  
  .put('/:id', ProductController.updateProduct, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      category: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      imageUrl: t.Optional(t.String()),
      description: t.Optional(t.String())
    }),
    detail: {
      summary: 'Update product',
      description: 'Update an existing product (Admin only)',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Product updated successfully'
        },
        404: {
          description: 'Product not found'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  })
  
  .delete('/:id', ProductController.deleteProduct, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Delete product',  
      description: 'Delete a product from the catalog (Admin only)',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Product deleted successfully'
        },
        404: {
          description: 'Product not found'
        },
        401: {
          description: 'Unauthorized'
        }
      }
    }
  });

export default productsRoutes;