module.exports = {
  apps: [
    {
      name: "daily-report",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
