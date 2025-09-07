const express = require('express');
const app = express();
app.get('/', (req, res) => res.json({message: 'Working!'}));
app.listen(3005, () => console.log('http://localhost:3005'));