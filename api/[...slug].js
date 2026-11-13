// Vercel Catch-all Serverless Function for all /api/* routes
process.env.VERCEL = process.env.VERCEL || '1';

const app = require('../server');

module.exports = app;

