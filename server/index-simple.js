require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Starting simple server...');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  console.log('GET / received');
  res.json({
    success: true,
    message: 'Simple server is working!',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`✅ Simple server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('❌ Server error:', err);
});