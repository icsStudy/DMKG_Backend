/** PM2 process map for unified production container (see Dockerfile). */
module.exports = {
  apps: [
    {
      name: 'gateway',
      cwd: './services/api-gateway',
      script: 'dist/server.js',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        CORE_SERVICE_URL: 'http://localhost:3010',
        AI_SERVICE_URL: 'http://localhost:3020',
        SOCIAL_SERVICE_URL: 'http://localhost:3030',
      },
    },
    {
      name: 'core',
      cwd: './services/core-service',
      script: 'dist/server.js',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        CORE_PORT: 3010,
        AI_SERVICE_URL: 'http://localhost:3020',
      },
    },
    {
      name: 'ai',
      cwd: './services/ai-service',
      script: 'dist/server.js',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        AI_PORT: 3020,
      },
    },
    {
      name: 'social',
      cwd: './services/social-service',
      script: 'dist/server.js',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        SOCIAL_PORT: 3030,
      },
    },
    {
      name: 'worker',
      cwd: './services/worker-service',
      script: 'dist/main.js',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        CORE_SERVICE_URL: 'http://localhost:3010',
      },
    },
  ],
};
