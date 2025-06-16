module.exports = {
  apps: [{
    name: 'carabao-product-management-api',
    script: 'bun',
    args: 'src/index.ts',
    interpreter: '',
    watch: false,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}; 