module.exports = {
  apps: [{
    name: "blog-server",
    script: "./dist/app.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    env_development: {
      NODE_ENV: "development",
    }
  }]
}
