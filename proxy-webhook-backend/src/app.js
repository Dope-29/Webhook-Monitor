const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();

//security and optimization middlewares
app.use(helmet());
app.use(cors());
app.use(compression());

//for reading raw webhook payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//health check routes
app.get('/health', (req, res) => {
  console.error(err.stack);
  res.status(500).json({error : 'Internal server error'});
});

module.exports = app;