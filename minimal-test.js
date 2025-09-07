const express = require('express');
const app = express();
const PORT = 3002;

console.log('1. Starting minimal server...');

app.get('/', (req, res) => {
  console.log('Request received!');
  res.json({ message: 'Minimal server works!' });
});

console.log('2. Routes set up');

const server = app.listen(PORT, () => {
  console.log('3. ✅ Minimal server running on http://localhost:' + PORT);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

console.log('4. Server setup complete');
