const express = require('express');
const app = express();
const PORT = 3003;

app.get('/', (req, res) => {
  console.log('Request received from:', req.connection.remoteAddress);
  res.json({ 
    message: 'Server is working!',
    timestamp: new Date(),
    port: PORT 
  });
});

// Explicitly bind to all interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log('Server bound to:', address);
  console.log('Server listening on ALL interfaces at port', PORT);
  console.log('Try: http://localhost:' + PORT);
  console.log('Try: http://127.0.0.1:' + PORT);
});

server.on('error', (err) => {
  console.error('Server binding error:', err);
});

server.on('listening', () => {
  console.log('Server is definitely listening now');
});
