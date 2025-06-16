module.exports = {
  apps: [
    {
      name: 'carabao-api',
      script: './src/index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      interpreter: 'bun'
    },
    {
      name: 'carabao-workers',
      script: './scripts/start-workers.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      interpreter: 'bun'
    }
  ]
}; 