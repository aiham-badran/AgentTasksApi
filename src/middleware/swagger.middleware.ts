import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger.js';

export const swaggerDocs = '/docs';
export const swaggerStack = [
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'AgentTasks API — Docs',
    swaggerOptions: {
      persistAuthorization: true, // لا تفقد الـ token عند التحديث
    },
  }),
];
