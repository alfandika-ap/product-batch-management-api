export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export class ResponseUtil {
  /**
   * Success response
   */
  static success<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
      success: true,
      message,
      data
    };
  }

  /**
   * Error response
   */
  static error(message: string, error?: string): ApiResponse {
    return {
      success: false,
      message,
      error
    };
  }

  /**
   * Validation error response
   */
  static validationError(
    errors: Record<string, string[]>, 
    message: string = 'Validation failed'
  ): ApiResponse {
    return {
      success: false,
      message,
      errors
    };
  }

  /**
   * Unauthorized error response
   */
  static unauthorized(message: string = 'Unauthorized'): ApiResponse {
    return {
      success: false,
      message,
      error: 'UNAUTHORIZED'
    };
  }

  /**
   * Forbidden error response
   */
  static forbidden(message: string = 'Forbidden'): ApiResponse {
    return {
      success: false,
      message,
      error: 'FORBIDDEN'
    };
  }

  /**
   * Not found error response
   */
  static notFound(message: string = 'Resource not found'): ApiResponse {
    return {
      success: false,
      message,
      error: 'NOT_FOUND'
    };
  }

  /**
   * Internal server error response
   */
  static internalError(message: string = 'Internal server error'): ApiResponse {
    return {
      success: false,
      message,
      error: 'INTERNAL_ERROR'
    };
  }
} 