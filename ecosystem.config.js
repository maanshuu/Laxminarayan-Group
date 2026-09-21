module.exports = {
  apps: [
    {
      name: "laxminarayan-group",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 4000,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        TZ: "Asia/Kolkata"
      }
    }
  ]
};
