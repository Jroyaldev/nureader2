import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// API Error class
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error response helper
export function errorResponse(error: ApiError | Error | unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'ValidationError',
        message: 'Invalid request data',
        statusCode: 400,
        details: error.errors,
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        statusCode: 500,
      },
      { status: 500 }
    );
  }

  console.error('Unknown error:', error);
  return NextResponse.json(
    {
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
    { status: 500 }
  );
}

// Success response helper
export function successResponse<T>(
  data: T,
  metadata?: { requestId?: string },
  status: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
    { status }
  );
}

// Paginated response helper
export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number
) {
  const totalPages = Math.ceil(totalItems / limit);
  
  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      totalPages,
      totalItems,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

// Authentication middleware
export async function requireAuth(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiError('Unauthorized', 401, 'AUTH_REQUIRED');
  }

  return user;
}

// Request validation middleware
export async function validateRequest<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
): Promise<z.infer<T>> {
  try {
    let data: unknown;

    switch (source) {
      case 'body':
        try {
          data = await request.json();
        } catch {
          throw new ApiError('Invalid JSON body', 400, 'INVALID_JSON');
        }
        break;
      case 'query':
        const searchParams = new URL(request.url).searchParams;
        data = Object.fromEntries(searchParams.entries());
        break;
      case 'params':
        // Params are typically passed directly to the handler
        data = {};
        break;
    }

    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error; // Will be handled by errorResponse
    }
    throw error;
  }
}

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Simple rate limiting middleware
export async function rateLimit(
  request: NextRequest,
  options: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: NextRequest) => string;
  } = {}
) {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 60,
    keyGenerator = (req) => {
      // Use IP address as default key
      return req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
    },
  } = options;

  const key = keyGenerator(request);
  const now = Date.now();
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetAt < now) {
      rateLimitStore.delete(k);
    }
  }

  const limit = rateLimitStore.get(key);
  
  if (!limit) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (limit.resetAt < now) {
    limit.count = 1;
    limit.resetAt = now + windowMs;
    return;
  }

  limit.count++;
  
  if (limit.count > maxRequests) {
    throw new ApiError(
      'Too many requests',
      429,
      'RATE_LIMIT_EXCEEDED',
      {
        retryAfter: Math.ceil((limit.resetAt - now) / 1000),
      }
    );
  }
}

// CORS headers helper
export function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// API handler wrapper with error handling
export function apiHandler<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Add request ID for tracking
      const requestId = crypto.randomUUID();
      request.headers.set('x-request-id', requestId);

      // Handle OPTIONS requests for CORS
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 204,
          headers: corsHeaders(),
        });
      }

      // Execute the handler
      const response = await handler(request, context);
      
      // Add CORS headers to response
      Object.entries(corsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Add request ID to response
      response.headers.set('x-request-id', requestId);
      
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };
}