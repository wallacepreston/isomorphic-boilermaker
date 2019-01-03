

import React from 'react'
const express = require('express');
const app = express();
const path = require('path')
const morgan = require('morgan');
const {db, User} = require('./db');
const session = require('express-session')
const passport = require('passport');
const { renderToString } = require('react-dom/server');
const Root = require('../client/components/root');
const template = require('./template')

// serializing user is adding session information to our store in DB, so Passport knows how to find the user for subsequent requests.
passport.serializeUser((user, done) => {
  console.log('serializing user: ');
  console.log(user)
  done(null, user.id)
});

// ...and for all subsequent requests, the user is "deserialized" or looked up from the database by the id we gave it when serializing
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => done(null, user))
    .catch(done);
});

// MIDDLEWARE
//    logging middleware
app.use(morgan('dev'));

//    Body parsing middleware
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// configure and create our database store
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const dbStore = new SequelizeStore({ db: db });

// sync so that our session table gets created
dbStore.sync();

// plug the store into our session middleware
//    Session Middleware

// app.use(session());

// plug the store into our session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'a wildly insecure secret',
  store: dbStore,
  resave: false,
  saveUninitialized: false
}));

// Passport: Initialize
app.use(passport.initialize());
app.use(passport.session());

// Static Middleware: Allows users/clients to access all files in the `public` directory
app.use(express.static(path.join(__dirname, '..', 'public')))

// Authentication Router
app.use('/auth', require('./auth'))

let initialState = {
}

//SSR function import
const ssr = require('./server');

// server rendered home page
app.get('/', (req, res) => {
  const { preloadedState, content}  = ssr(initialState)
  const response = template("Server Rendered Page", preloadedState, content)
  res.setHeader('Cache-Control', 'assets, max-age=604800')
  res.send(response);
});

// Pure client side rendered page
app.get('/client', (req, res) => {
  let response = template('Client Side Rendered page')
  res.setHeader('Cache-Control', 'assets, max-age=604800')
  res.send(response);
});

// tiny trick to stop server during local development

  app.get('/exit', (req, res) => {
    if(process.env.PORT) {
      res.send("Sorry, the server denies your request")
    } else {
      res.send("shutting down")
      process.exit(0)
    }

  });

// For all GET requests that aren't to an API or auth route, send index.html
// app.get( '/*', ( req, res ) => {
//   const jsx = ( <Root /> );
//   const reactDom = renderToString( jsx );

//   res.writeHead( 200, { 'Content-Type': 'text/html' } );
//   res.end( htmlTemplate( reactDom ) );
// } );

function htmlTemplate( reactDom ) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>React SSR</title>
      </head>
      
      <body>
          <div id="app">${ reactDom }</div>
          <script src="./app.bundle.js"></script>
      </body>
      </html>
  `;
}

// Handle 404s
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

app.use(function (err, req, res, next) {
  console.error(err);
  console.error(err.stack);
  res.status(err.status || 500)
  res.send(err.message || 'Internal server error.');
});

module.exports = app
