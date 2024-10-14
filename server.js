const express = require('express');
const routes = require('./routes/index');

const app = express();
const port = process.env.PORT || 3000;

app.use('/', routes);

app.get('/status', (req, res) => {
  res.send('OK');
});

app.listen(port);
