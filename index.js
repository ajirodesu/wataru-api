// index.js

const path = require('path');

// Ensure the working directory is always the project root
process.chdir(__dirname);

// Load the app from core/app.js
const app = require(path.join(process.cwd(), 'core', 'app.js'));

// Optional: handle uncaught errors globally
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Process terminated.');
  process.exit(0);
});