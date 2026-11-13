const express = require('express');
const { initDB } = require('../db');
const app = express();

initDB().then(() => {
  const server = app.listen(3000, () => {
    console.log('Test server started on 3000');
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT');
    server.close();
  });
  
  process.on('exit', (code) => {
    console.log('Process exit with code', code);
  });
}).catch(err => {
  console.error('InitDB error:', err);
});

