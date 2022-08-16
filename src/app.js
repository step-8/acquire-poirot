const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { createAuthRouter } = require('./routers/authRouter');
const { createHostRouter } = require('./routers/hostRouter');

// routes
const apiRoutes = require('./routers/apiRoutes.js');

// middlewares
const { restrict } = require('./middlewares/auth.js');

// handlers
const { serveGamePage, joinGame, serveLobby } = require('./handlers/game.js');
const session = require('express-session');
const DataStore = require('./dataStore.js');
const { Games } = require('./models/games.js');
const { injectGame } = require('./middlewares/game');

const { LOGIN_TEMPLATE,
  SIGNUP_TEMPLATE,
  HOST_TEMPLATE_PATH,
  USERS_DB_PATH,
  GAME_TEMPLATE_PATH,
  SESSION_KEY
} = process.env;

const resources = {
  LOGIN_TEMPLATE,
  SIGNUP_TEMPLATE,
  HOST_TEMPLATE_PATH,
  USERS_DB_PATH,
  GAME_TEMPLATE_PATH
};

const appConfig = {
  root: './public',
  sessionKey: SESSION_KEY,
  session,
  games: new Games()
};

const createApp = (config = appConfig, dataStore = new DataStore(resources)) => {
  const { root, sessionKey, session, games } = config;
  const app = express();
  app.use(morgan('tiny'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(cookieParser());
  app.use(session(
    {
      saveUninitialized: false,
      resave: false,
      secret: sessionKey
    }
  ));

  // injecting games to app
  app.games = games;

  const authRouter = createAuthRouter(dataStore);
  app.use(authRouter);

  const hostRouter = createHostRouter(dataStore);
  app.use(hostRouter);

  app.get('/join/:id', restrict, joinGame);
  app.get('/lobby/:id', restrict, serveLobby);

  app.get('/game', restrict, serveGamePage(dataStore));

  app.use('/api', restrict, injectGame, apiRoutes);
  app.use(express.static(root));
  return app;
};

module.exports = { createApp };
