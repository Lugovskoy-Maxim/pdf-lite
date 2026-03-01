module.exports = {
  apps: [
    {
      name: "pdf-lite",
      script: "npm",
      args: "start",
      cwd: "/opt/pdf-lite",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3033,
      },
    },
  ],
};
