const express = require('express');
const routes = require('./routes/index');

const app = express();
const port = process.env.PORT || 5000;

// parse JSON body
app.use(express.json());

app.use('/', routes);

app.listen(port);
