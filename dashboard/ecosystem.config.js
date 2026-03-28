module.exports = {
  apps: [
    {
      name: 'jun-dashboard',
      script: 'server.js',
      cwd: '/home/issacs/work/projects/claude-dev-forge/dashboard',
      node_args: '--unhandled-rejections=warn',
      watch: false,
      autorestart: true,
      max_restarts: 50,
      min_uptime: '5s',
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        DASHBOARD_PORT: 7700,
        DASHBOARD_HOST: '58.29.21.11'
      },
      error_file: '/home/issacs/.jun-ai/logs/dashboard-error.log',
      out_file: '/home/issacs/.jun-ai/logs/dashboard-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'jun-telegram',
      script: 'telegram-bridge.js',
      cwd: '/home/issacs/work/projects/claude-dev-forge/dashboard',
      node_args: '--unhandled-rejections=warn',
      watch: false,
      autorestart: true,
      max_restarts: 100,
      min_uptime: '3s',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/issacs/.jun-ai/logs/telegram-error.log',
      out_file: '/home/issacs/.jun-ai/logs/telegram-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'jun-api-docs',
      script: 'api-docs.js',
      cwd: '/home/issacs/work/projects/claude-dev-forge/dashboard',
      watch: false,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/issacs/.jun-ai/logs/api-docs-error.log',
      out_file: '/home/issacs/.jun-ai/logs/api-docs-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
