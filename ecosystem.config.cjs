module.exports = {
  apps: [
    {
      name: "nexa-worker",
      script: "npx",
      args: "--yes tsx src/lib/nexa-core/kernel/start.ts",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      env: {
        NODE_ENV: "development"
      }
    },
    {
      name: "nexa-api",
      script: "npm",
      args: "run dev",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
