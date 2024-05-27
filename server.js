'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');
const db = require('./db-connection');

const app = express();

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' }));

app.use(helmet());
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.dnsPrefetchControl({ allow: false }));
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



// Sample front-end
app.route('/:board/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/board.html');
  });

app.route('/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
  });

app.route('/b/:board/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/board.html');
  });

app.route('/b/:board/:threadid')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

// For FCC testing purposes
fccTestingRoutes(app);

// Routing for API 
app.use('/api', apiRoutes);

// 404 Not Found Middleware
app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Start the server after the database connection is established
db.then(() => {
  app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on port " + process.env.PORT || 3000);
    if (process.env.NODE_ENV === 'test') {
      console.log('Running Tests...');
      setTimeout(() => {
        try {
          runner.run();
        } catch (e) {
          console.log('Tests are not valid:');
          console.error(e);
        }
      }, 1500);
    }
  });
}).catch(err => {
  console.error('Failed to start server due to database connection error:', err);
});

module.exports = app;
