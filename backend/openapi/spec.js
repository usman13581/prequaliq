/**
 * OpenAPI 3.0 spec for PrequaliQ backend — served at GET /api-docs
 */
const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');
const GPU_DOCS_URL = AI_SERVICE_URL ? `${AI_SERVICE_URL}/docs` : null;

const bearerAuth = { bearerAuth: [] };

function buildOpenApiSpec(serverUrl = 'http://localhost:5001') {
  const base = serverUrl.replace(/\/$/, '');

  return {
    openapi: '3.0.3',
    info: {
      title: 'PrequaliQ API',
      version: '1.0.0',
      description: [
        'PrequaliQ supplier qualification platform — all REST endpoints.',
        '',
        GPU_DOCS_URL
          ? `**GPU AI service (Ollama extraction):** [${GPU_DOCS_URL}](${GPU_DOCS_URL})`
          : '**GPU AI service:** set `AI_SERVICE_URL` in backend `.env` to link external Swagger.',
        '',
        'Authenticated routes require `Authorization: Bearer <JWT>` from `POST /api/auth/login`.',
      ].join('\n'),
    },
    servers: [{ url: base, description: 'Current server' }],
    tags: [
      { name: 'Health', description: 'Service health' },
      { name: 'Auth', description: 'Registration, login, profile' },
      { name: 'Admin', description: 'Admin-only management' },
      { name: 'Supplier', description: 'Supplier portal' },
      { name: 'Supplier AI', description: 'AI-assisted profile extraction (proxies to GPU service)' },
      { name: 'Procuring Entity', description: 'Buyer portal' },
      { name: 'Questionnaires', description: 'Questionnaire CRUD and responses' },
      { name: 'Documents', description: 'File uploads' },
      { name: 'CPV', description: 'Common Procurement Vocabulary codes' },
      { name: 'NUTS', description: 'NUTS region codes' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            error: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'procuring_entity', 'supplier'] },
          },
        },
        AiStatus: {
          type: 'object',
          properties: {
            configured: { type: 'boolean' },
            online: { type: 'boolean' },
            ollama: { type: 'boolean' },
            model: { type: 'string' },
            status: { type: 'string' },
          },
        },
        InsuranceAiSuggestions: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'object',
              properties: {
                insurerName: { type: 'string', nullable: true },
                insurancePolicyNumber: { type: 'string', nullable: true },
                insuranceCoverageAmount: { type: 'string', nullable: true },
                insuranceValidTo: { type: 'string', nullable: true },
              },
            },
            disclaimer: { type: 'string' },
          },
        },
        ProfileAiSuggestions: {
          type: 'object',
          properties: {
            suggestions: { type: 'object', additionalProperties: true },
            conflicts: { type: 'array', items: { type: 'object' } },
            documents: { type: 'array', items: { type: 'object' } },
            disclaimer: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'API health check',
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register user',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
          },
          responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login — returns JWT',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: { 200: { description: 'Token + user' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/api/auth/profile': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [bearerAuth],
          responses: { 200: { description: 'User profile' } },
        },
      },
      '/api/auth/reset-password': {
        put: {
          tags: ['Auth'],
          summary: 'Reset password',
          security: [bearerAuth],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated' } },
        },
      },
      '/api/auth/profile-picture': {
        put: {
          tags: ['Auth'],
          summary: 'Upload profile picture',
          security: [bearerAuth],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Auth'],
          summary: 'Remove profile picture',
          security: [bearerAuth],
          responses: { 200: { description: 'Removed' } },
        },
      },

      '/api/admin/dashboard/stats': {
        get: { tags: ['Admin'], summary: 'Dashboard statistics', security: [bearerAuth], responses: { 200: { description: 'Stats' } } },
      },
      '/api/admin/suppliers': {
        get: { tags: ['Admin'], summary: 'List suppliers', security: [bearerAuth], responses: { 200: { description: 'Suppliers' } } },
        post: { tags: ['Admin'], summary: 'Create supplier', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
      },
      '/api/admin/suppliers/{supplierId}': {
        get: { tags: ['Admin'], summary: 'Get supplier by ID', security: [bearerAuth], parameters: [{ name: 'supplierId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Supplier' } } },
        put: { tags: ['Admin'], summary: 'Update supplier', security: [bearerAuth], parameters: [{ name: 'supplierId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Admin'], summary: 'Delete supplier', security: [bearerAuth], parameters: [{ name: 'supplierId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },
      '/api/admin/suppliers/{supplierId}/review': {
        put: { tags: ['Admin'], summary: 'Approve/reject supplier', security: [bearerAuth], parameters: [{ name: 'supplierId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Reviewed' } } },
      },
      '/api/admin/suppliers/{supplierId}/toggle-status': {
        put: { tags: ['Admin'], summary: 'Activate/deactivate supplier', security: [bearerAuth], parameters: [{ name: 'supplierId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Toggled' } } },
      },
      '/api/admin/suppliers/{supplierId}/reset-password': {
        put: { tags: ['Admin'], summary: 'Reset supplier password', security: [bearerAuth], parameters: [{ name: 'supplierId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Reset' } } },
      },
      '/api/admin/procuring-entities': {
        get: { tags: ['Admin'], summary: 'List procuring entities', security: [bearerAuth], responses: { 200: { description: 'Entities' } } },
        post: { tags: ['Admin'], summary: 'Create procuring entity', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
      },
      '/api/admin/procuring-entities/{entityId}': {
        get: { tags: ['Admin'], summary: 'Get entity by ID', security: [bearerAuth], parameters: [{ name: 'entityId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Entity' } } },
        put: { tags: ['Admin'], summary: 'Update entity', security: [bearerAuth], parameters: [{ name: 'entityId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Admin'], summary: 'Delete entity', security: [bearerAuth], parameters: [{ name: 'entityId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },
      '/api/admin/procuring-entities/{entityId}/toggle-status': {
        put: { tags: ['Admin'], summary: 'Toggle entity status', security: [bearerAuth], parameters: [{ name: 'entityId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Toggled' } } },
      },
      '/api/admin/procuring-entities/{entityId}/reset-password': {
        put: { tags: ['Admin'], summary: 'Reset entity password', security: [bearerAuth], parameters: [{ name: 'entityId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Reset' } } },
      },
      '/api/admin/companies': {
        get: { tags: ['Admin'], summary: 'List companies', security: [bearerAuth], responses: { 200: { description: 'Companies' } } },
        post: { tags: ['Admin'], summary: 'Create company', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
      },
      '/api/admin/debug/suppliers': {
        get: { tags: ['Admin'], summary: 'Debug supplier data', security: [bearerAuth], responses: { 200: { description: 'Debug info' } } },
      },

      '/api/supplier/dashboard': {
        get: { tags: ['Supplier'], summary: 'Supplier dashboard', security: [bearerAuth], responses: { 200: { description: 'Dashboard data' } } },
      },
      '/api/supplier/profile': {
        get: { tags: ['Supplier'], summary: 'Get supplier profile', security: [bearerAuth], responses: { 200: { description: 'Profile' } } },
        put: { tags: ['Supplier'], summary: 'Update supplier profile', security: [bearerAuth], responses: { 200: { description: 'Updated' } } },
      },
      '/api/supplier/profile/completeness': {
        get: { tags: ['Supplier'], summary: 'Profile completeness score', security: [bearerAuth], responses: { 200: { description: 'Completeness' } } },
      },
      '/api/supplier/profile/submit': {
        post: { tags: ['Supplier'], summary: 'Submit profile for qualification', security: [bearerAuth], responses: { 200: { description: 'Submitted' } } },
      },
      '/api/supplier/profile/export': {
        get: { tags: ['Supplier'], summary: 'Export profile (Excel/PDF)', security: [bearerAuth], parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['xlsx', 'pdf'] } }], responses: { 200: { description: 'File download' } } },
      },
      '/api/supplier/profile/submissions': {
        get: { tags: ['Supplier'], summary: 'Profile submission history', security: [bearerAuth], responses: { 200: { description: 'Submissions' } } },
      },
      '/api/supplier/qualification': {
        get: { tags: ['Supplier'], summary: 'Qualification certificate data', security: [bearerAuth], responses: { 200: { description: 'Qualification' } } },
      },
      '/api/supplier/cpv-codes': {
        put: { tags: ['Supplier'], summary: 'Update CPV codes', security: [bearerAuth], responses: { 200: { description: 'Updated' } } },
      },
      '/api/supplier/nuts-codes': {
        put: { tags: ['Supplier'], summary: 'Update NUTS codes', security: [bearerAuth], responses: { 200: { description: 'Updated' } } },
      },
      '/api/supplier/references': {
        get: { tags: ['Supplier'], summary: 'List references', security: [bearerAuth], responses: { 200: { description: 'References' } } },
        post: { tags: ['Supplier'], summary: 'Create reference', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
      },
      '/api/supplier/references/{referenceId}': {
        put: { tags: ['Supplier'], summary: 'Update reference', security: [bearerAuth], parameters: [{ name: 'referenceId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Supplier'], summary: 'Delete reference', security: [bearerAuth], parameters: [{ name: 'referenceId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },
      '/api/supplier/notifications': {
        get: { tags: ['Supplier'], summary: 'List notifications', security: [bearerAuth], responses: { 200: { description: 'Notifications' } } },
      },
      '/api/supplier/notifications/{notificationId}/read': {
        put: { tags: ['Supplier'], summary: 'Mark notification read', security: [bearerAuth], parameters: [{ name: 'notificationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Marked' } } },
      },
      '/api/supplier/notifications/read-all': {
        put: { tags: ['Supplier'], summary: 'Mark all notifications read', security: [bearerAuth], responses: { 200: { description: 'Marked' } } },
      },
      '/api/supplier/questionnaires/active': {
        get: { tags: ['Supplier'], summary: 'Active questionnaires', security: [bearerAuth], responses: { 200: { description: 'Questionnaires' } } },
      },
      '/api/supplier/questionnaires/history': {
        get: { tags: ['Supplier'], summary: 'Questionnaire response history', security: [bearerAuth], responses: { 200: { description: 'History' } } },
      },

      '/api/supplier/ai/status': {
        get: {
          tags: ['Supplier AI'],
          summary: 'AI service health (GPU + Ollama)',
          security: [bearerAuth],
          responses: {
            200: { description: 'AI status', content: { 'application/json': { schema: { $ref: '#/components/schemas/AiStatus' } } } },
          },
        },
      },
      '/api/supplier/ai/endpoints': {
        get: {
          tags: ['Supplier AI'],
          summary: 'AI endpoint catalog (backend + GPU)',
          description: GPU_DOCS_URL
            ? `Includes link to GPU Swagger at ${GPU_DOCS_URL}`
            : 'Set AI_SERVICE_URL to populate GPU catalog.',
          security: [bearerAuth],
          responses: { 200: { description: 'Endpoint catalogs' } },
        },
      },
      '/api/supplier/insurance/ai-suggest': {
        post: {
          tags: ['Supplier AI'],
          summary: 'AI suggest insurance fields from PDF',
          security: [bearerAuth],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['document'],
                  properties: {
                    document: { type: 'string', format: 'binary', description: 'Insurance PDF' },
                    language: { type: 'string', example: 'en' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Suggestions', content: { 'application/json': { schema: { $ref: '#/components/schemas/InsuranceAiSuggestions' } } } },
            503: { description: 'AI unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/supplier/profile/ai-suggest': {
        post: {
          tags: ['Supplier AI'],
          summary: 'AI suggest profile fields from multiple PDFs',
          description: 'Upload up to 10 PDFs. Classifies each document and merges field suggestions. Human review required.',
          security: [bearerAuth],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['documents'],
                  properties: {
                    documents: {
                      type: 'array',
                      items: { type: 'string', format: 'binary' },
                      description: 'PDF files (max 10)',
                    },
                    language: { type: 'string', example: 'en' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Merged suggestions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfileAiSuggestions' } } } },
            503: { description: 'AI unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      '/api/procuring-entity/dashboard/stats': {
        get: { tags: ['Procuring Entity'], summary: 'Dashboard stats', security: [bearerAuth], responses: { 200: { description: 'Stats' } } },
      },
      '/api/procuring-entity/profile': {
        get: { tags: ['Procuring Entity'], summary: 'Get entity profile', security: [bearerAuth], responses: { 200: { description: 'Profile' } } },
        put: { tags: ['Procuring Entity'], summary: 'Update entity profile', security: [bearerAuth], responses: { 200: { description: 'Updated' } } },
      },
      '/api/procuring-entity/suppliers': {
        get: { tags: ['Procuring Entity'], summary: 'Search approved suppliers', security: [bearerAuth], responses: { 200: { description: 'Suppliers' } } },
      },
      '/api/procuring-entity/suppliers/{supplierId}': {
        get: { tags: ['Procuring Entity'], summary: 'Supplier detail + responses', security: [bearerAuth], parameters: [{ name: 'supplierId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Details' } } },
      },

      '/api/questionnaires': {
        get: { tags: ['Questionnaires'], summary: 'List questionnaires (procuring entity)', security: [bearerAuth], responses: { 200: { description: 'List' } } },
        post: { tags: ['Questionnaires'], summary: 'Create questionnaire', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
      },
      '/api/questionnaires/{questionnaireId}': {
        put: { tags: ['Questionnaires'], summary: 'Update questionnaire', security: [bearerAuth], parameters: [{ name: 'questionnaireId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Questionnaires'], summary: 'Delete questionnaire', security: [bearerAuth], parameters: [{ name: 'questionnaireId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },
      '/api/questionnaires/{questionnaireId}/toggle-status': {
        put: { tags: ['Questionnaires'], summary: 'Open/close questionnaire', security: [bearerAuth], parameters: [{ name: 'questionnaireId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Toggled' } } },
      },
      '/api/questionnaires/{questionnaireId}/questions/{questionId}': {
        put: { tags: ['Questionnaires'], summary: 'Update question', security: [bearerAuth], parameters: [{ name: 'questionnaireId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'questionId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Questionnaires'], summary: 'Delete question', security: [bearerAuth], parameters: [{ name: 'questionnaireId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'questionId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },
      '/api/questionnaires/{questionnaireId}/responses': {
        get: { tags: ['Questionnaires'], summary: 'Get response (supplier) or list responses (entity)', security: [bearerAuth], parameters: [{ name: 'questionnaireId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Response(s)' } } },
        post: { tags: ['Questionnaires'], summary: 'Submit questionnaire response (supplier)', security: [bearerAuth], parameters: [{ name: 'questionnaireId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Submitted' } } },
      },

      '/api/documents': {
        get: { tags: ['Documents'], summary: 'List documents', security: [bearerAuth], responses: { 200: { description: 'Documents' } } },
      },
      '/api/documents/supplier': {
        post: { tags: ['Documents'], summary: 'Upload supplier document', security: [bearerAuth], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { 201: { description: 'Uploaded' } } },
      },
      '/api/documents/supplier/{documentId}/metadata': {
        put: { tags: ['Documents'], summary: 'Update document metadata', security: [bearerAuth], parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      },
      '/api/documents/procuring-entity': {
        post: { tags: ['Documents'], summary: 'Upload entity document', security: [bearerAuth], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { 201: { description: 'Uploaded' } } },
      },
      '/api/documents/{documentId}': {
        delete: { tags: ['Documents'], summary: 'Delete document', security: [bearerAuth], parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },

      '/api/cpv/count': {
        get: { tags: ['CPV'], summary: 'CPV code count (public)', responses: { 200: { description: 'Count' } } },
      },
      '/api/cpv': {
        get: { tags: ['CPV'], summary: 'List CPV codes', security: [bearerAuth], responses: { 200: { description: 'Codes' } } },
        post: { tags: ['CPV'], summary: 'Create CPV code (admin)', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
      },
      '/api/cpv/{cpvId}': {
        get: { tags: ['CPV'], summary: 'Get CPV by ID', security: [bearerAuth], parameters: [{ name: 'cpvId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Code' } } },
      },

      '/api/nuts/count': {
        get: { tags: ['NUTS'], summary: 'NUTS code count (public)', responses: { 200: { description: 'Count' } } },
      },
      '/api/nuts': {
        get: { tags: ['NUTS'], summary: 'List NUTS codes', security: [bearerAuth], responses: { 200: { description: 'Codes' } } },
      },
    },
    externalDocs: GPU_DOCS_URL
      ? { description: 'GPU AI Service (FastAPI Swagger)', url: GPU_DOCS_URL }
      : undefined,
  };
}

module.exports = { buildOpenApiSpec, GPU_DOCS_URL };
