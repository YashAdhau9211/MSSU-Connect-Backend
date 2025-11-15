import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MSSU Connect - Authentication & User Management API',
      version: '1.0.0',
      description: `
        Comprehensive API documentation for the MSSU Connect Authentication & User Management module.
        
        This API provides secure authentication, role-based access control (RBAC), multi-campus user segmentation,
        and comprehensive user management capabilities for the MSSU Connect university management system.
        
        ## Features
        - Multi-method authentication (email/password, mobile/OTP)
        - JWT-based stateless authentication with refresh tokens
        - Five-tier role-based access control (Student, Teacher, Parent, Admin, Super_Admin)
        - Multi-campus data segmentation and isolation
        - Comprehensive user lifecycle management
        - Multi-factor authentication (MFA) for sensitive operations
        - Secure password reset and account recovery
        - Session management with device tracking
        - Comprehensive audit logging
        
        ## Authentication
        Most endpoints require authentication using a Bearer token in the Authorization header.
        Obtain tokens by logging in via \`POST /api/v1/auth/login\` or \`POST /api/v1/auth/otp/verify\`.
        
        ## Rate Limiting
        - Authentication endpoints: 10 requests per minute per IP
        - OTP requests: 3 requests per hour per phone number
        - General API: 100 requests per minute per user
        
        ## Error Handling
        All errors follow a consistent format with appropriate HTTP status codes and error details.
      `,
      contact: {
        name: 'MSSU Connect Team',
        email: 'support@mssu.ac.in'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://staging-api.mssu.ac.in',
        description: 'Staging server'
      },
      {
        url: 'https://api.mssu.ac.in',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from login or OTP verification'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'Full name of the user'
            },
            phone: {
              type: 'string',
              pattern: '^\\+91[0-9]{10}$',
              description: 'Phone number in Indian format (+91 followed by 10 digits)'
            },
            role: {
              type: 'string',
              enum: ['Student', 'Teacher', 'Parent', 'Admin', 'Super_Admin'],
              description: 'User role determining access permissions'
            },
            campus_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the campus the user belongs to'
            },
            profile_picture_url: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'URL of the user profile picture'
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'User address (encrypted at rest)'
            },
            account_status: {
              type: 'string',
              enum: ['active', 'inactive', 'locked'],
              description: 'Current status of the user account'
            },
            last_login_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Timestamp of last successful login'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Campus: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'Campus name'
            },
            code: {
              type: 'string',
              description: 'Campus code (NM, TH, NG, PN)'
            },
            address: {
              type: 'string'
            },
            contact_email: {
              type: 'string',
              format: 'email'
            },
            contact_phone: {
              type: 'string'
            },
            is_active: {
              type: 'boolean'
            }
          }
        },
        Session: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Session identifier'
            },
            device_type: {
              type: 'string',
              enum: ['mobile', 'web', 'tablet'],
              description: 'Type of device'
            },
            device_name: {
              type: 'string',
              description: 'Device name or model'
            },
            ip_address: {
              type: 'string',
              description: 'IP address of the session'
            },
            last_activity: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Session creation timestamp'
            },
            is_current: {
              type: 'boolean',
              description: 'Whether this is the current session'
            }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            admin_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            action_type: {
              type: 'string',
              enum: ['login', 'logout', 'failed_login', 'user_created', 'user_updated', 'user_deleted', 'role_changed', 'status_changed', 'password_reset', 'mfa_verified']
            },
            resource_type: {
              type: 'string'
            },
            resource_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            ip_address: {
              type: 'string'
            },
            user_agent: {
              type: 'string'
            },
            details: {
              type: 'object',
              additionalProperties: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code for programmatic handling'
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message'
                },
                details: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'Additional error context (optional)'
                }
              }
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },
                details: {
                  type: 'object',
                  additionalProperties: {
                    type: 'string'
                  },
                  example: {
                    email: 'Invalid email format',
                    password: 'Password must be at least 8 characters'
                  }
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid/expired',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              examples: {
                tokenExpired: {
                  value: {
                    success: false,
                    error: {
                      code: 'TOKEN_EXPIRED',
                      message: 'JWT token has expired'
                    }
                  }
                },
                tokenInvalid: {
                  value: {
                    success: false,
                    error: {
                      code: 'TOKEN_INVALID',
                      message: 'JWT token is malformed or invalid'
                    }
                  }
                },
                unauthorized: {
                  value: {
                    success: false,
                    error: {
                      code: 'UNAUTHORIZED',
                      message: 'Authentication required'
                    }
                  }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions'
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'RESOURCE_NOT_FOUND',
                  message: 'Requested resource not found'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests'
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'An unexpected error occurred'
                }
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Page number for pagination'
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          description: 'Number of items per page (max 100)'
        },
        SortByParam: {
          in: 'query',
          name: 'sortBy',
          schema: {
            type: 'string',
            enum: ['name', 'email', 'created_at', 'last_login_at']
          },
          description: 'Field to sort by'
        },
        SortOrderParam: {
          in: 'query',
          name: 'sortOrder',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc'
          },
          description: 'Sort order'
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'User Management',
        description: 'User CRUD operations (Admin/Super_Admin only)'
      },
      {
        name: 'Profile',
        description: 'User profile management endpoints'
      },
      {
        name: 'Sessions',
        description: 'Session management and device tracking'
      },
      {
        name: 'Audit Logs',
        description: 'Security audit logs (Super_Admin only)'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
