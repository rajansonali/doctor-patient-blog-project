const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Doctor-Patient Blog API Working',
    timestamp: new Date(),
    endpoints: ['GET /categories', 'POST /login', 'GET /posts']
  });
});

app.get('/categories', (req, res) => {
  res.json([
    { id: 1, name: 'Mental Health' },
    { id: 2, name: 'Heart Disease' },
    { id: 3, name: 'Covid19' },
    { id: 4, name: 'Immunization' }
  ]);
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
  console.log('Try opening: http://localhost:' + PORT);
});
