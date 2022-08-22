const request = require('supertest');
const assert = require('assert');
const { createApp } = require('../../src/app.js');
const Sinon = require('sinon');
const { newGame } = require('../../src/models/game.js');
const { Games } = require('../../src/models/games.js');
const { Player } = require('../../src/models/player.js');
const { findTilesChain } = require('../../src/utils/game.js');

const session = (gameId, playerId) => () => (req, res, next) => {
  req.session = {};
  req.session.playerId = playerId;
  req.session.gameId = gameId;
  req.session.save = function (cb) {
    res.setHeader('set-cookie', 'connect.sid=23232');
    cb();
  };

  next();
};

const initApp = (session, games) => {
  const config = { session, root: './public', games };
  const dataStore = {
    load: Sinon.stub(),
    loadJSON: Sinon.stub()
  };

  return createApp(config, dataStore);
};

describe('GET /api/loadgame', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 4);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  const app = initApp(session('123', 'user'), games);

  it('should response with game data', (done) => {
    request(app)
      .get('/api/loadgame')
      .expect(200)
      .expect('content-type', /^application\/json/, done);
  });

  it('should response with game data when game started', (done) => {
    game.start();
    request(app)
      .get('/api/loadgame')
      .expect(200)
      .expect('content-type', /^application\/json/, done);
  });
});

// TODO : verify the game is started
describe('POST /api/start-game', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 4);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  game.addPlayer(new Player('user-2', 'harry', game));
  game.addPlayer(new Player('user-3', 'nilam', game));
  game.addPlayer(new Player('user-4', 'peter', game));
  const app = initApp(session('123', 'user'), games);

  it('should reorder the player, place tiles and start the game', (done) => {
    request(app)
      .post('/api/start-game')
      .expect('content-type', /json/)
      .expect(200, done);
  });

  it('should remove tile from player\'s tiles and place it on board',
    (done) => {
      const game = app.games.find('123');
      const player = game.turn.player;
      const tileId = player.tiles[0].id;

      request(app)
        .post('/api/place-tile')
        .send(`id=${tileId}`)
        .expect('content-type', /json/)
        .expect(200, done);
    });
});

describe('POST /api/place-tile', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 4);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  game.addPlayer(new Player('user-2', 'harry', game));
  game.addPlayer(new Player('user-3', 'nilam', game));
  game.addPlayer(new Player('user-4', 'peter', game));
  const app = initApp(session('123', 'user'), games);

  beforeEach((done) => {
    request(app)
      .post('/api/start-game')
      .expect('content-type', /json/)
      .expect(200, done);
  });

  it('should remove tile from player\'s tiles and place it on board',
    (done) => {
      const player = game.turn.player;
      const tileId = player.tiles[0].id;

      request(app)
        .post('/api/place-tile')
        .send(`id=${tileId}`)
        .expect('content-type', /json/)
        .expect(200, done);
    });
});

describe('Post /api/place-tile', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 4);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  game.addPlayer(new Player('user-2', 'harry', game));
  game.addPlayer(new Player('user-3', 'nilam', game));
  game.addPlayer(new Player('user-4', 'peter', game));
  const app = initApp(session('123', 'user'), games);

  beforeEach((done) => {
    request(app)
      .post('/api/start-game')
      .expect('content-type', /json/)
      .expect(200, done);
  });

  it('should grow corporation',
    (done) => {
      const player = game.turn.player;
      const tile = game.board.tiles.find(tile => tile.id === '3a');
      player.tiles.push(tile);

      const corporation = game.getCorporation('america');
      game.board.placeTile({ id: '1a' });
      game.board.placeTile({ id: '2a' });
      game.buildCorporation(corporation.id, '1a', 'user');

      const tileId = '3a';
      request(app)
        .post('/api/place-tile')
        .send(`id=${tileId}`)
        .expect('content-type', /json/)
        .expect(200, () => {
          assert.ok(corporation.getSize() >= 3);
          done();
        });
    });
});

describe('Post /api/place-tile', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 4);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  game.addPlayer(new Player('user-2', 'harry', game));
  game.addPlayer(new Player('user-3', 'nilam', game));
  game.addPlayer(new Player('user-4', 'peter', game));
  const app = initApp(session('123', 'user'), games);

  beforeEach((done) => {
    request(app)
      .post('/api/start-game')
      .expect('content-type', /json/)
      .expect(200, done);
  });

  it('Should determine a corporation is safe',
    (done) => {
      const player = game.turn.player;
      const tile = game.board.tiles.find(tile => tile.id === '4b');
      player.tiles.push(tile);

      const corporation = game.getCorporation('america');
      game.board.placeTile({ id: '1a' });
      game.board.placeTile({ id: '2a' });
      game.board.placeTile({ id: '3a' });
      game.board.placeTile({ id: '1b' });
      game.board.placeTile({ id: '2b' });
      game.board.placeTile({ id: '3b' });
      game.board.placeTile({ id: '1c' });
      game.board.placeTile({ id: '2c' });
      game.board.placeTile({ id: '3c' });
      game.board.placeTile({ id: '1d' });
      game.buildCorporation(corporation.id, '1a', 'user');

      const tileId = '4b';
      request(app)
        .post('/api/place-tile')
        .send(`id=${tileId}`)
        .expect('content-type', /json/)
        .expect(200, () => {
          assert.ok(corporation.getSize() >= 11);
          assert.ok(corporation.isSafeCorporation());
          done();
        });
    });

  it('should merge two corporations',
    (done) => {
      const player = game.turn.player;
      const tile = game.board.tiles.find(tile => tile.id === '3a');
      player.tiles.push(tile);

      const corporation1 = game.getCorporation('america');
      game.board.placeTile({ id: '1a' });
      game.board.placeTile({ id: '2a' });
      game.buildCorporation(corporation1.id, '1a', 'user');

      const corporation2 = game.getCorporation('zeta');
      game.board.placeTile({ id: '4a' });
      game.board.placeTile({ id: '5a' });
      game.board.placeTile({ id: '6a' });
      game.buildCorporation(corporation2.id, '4a', 'user');

      const tileId = '3a';
      request(app)
        .post('/api/place-tile')
        .send(`id=${tileId}`)
        .expect('content-type', /json/)
        .expect(200, done);
    });
});

describe('POST /api/draw-tile', () => {
  let currentPlayer;
  const games = new Games();
  beforeEach(done => {
    const host = { name: 'sam', id: 'user' };

    const game = newGame('123', host, 4);
    games.add(game);
    game.addPlayer(new Player('user', 'sam', game));
    game.addPlayer(new Player('user-2', 'harry', game));
    game.addPlayer(new Player('user-3', 'nilam', game));
    game.players.forEach(player => player.drawTile());
    game.reorder();
    game.start();

    currentPlayer = game.turn.player;
    done();
  });

  it('should draw a tile for the current player', (done) => {
    const app = initApp(session('123', currentPlayer.id), games);

    request(app)
      .post('/api/draw-tile')
      .expect('content-type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
        }
        const playerTile = currentPlayer.tiles[currentPlayer.tiles.length - 1];
        const [drawLog] = games.find('123').logs.slice(-1);
        assert.deepStrictEqual(res.body.data, playerTile);
        assert.strictEqual(drawLog, currentPlayer.name + ' drew a tile');
        done();
      });
  });

  it('should not draw tile if player is not playing', (done) => {
    const app = initApp(session('123', 'user-23'), games);
    request(app)
      .post('/api/draw-tile')
      .expect('content-type', /json/)
      .expect(400, done);
  });
});

describe('POST /api/build-corporation', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 1);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  const app = initApp(session('123', 'user'), games);

  before((done) => {
    request(app)
      .post('/api/start-game')
      .expect('content-type', /json/)
      .expect(200, done);
  });

  it('should build a corporation',
    (done) => {
      const player = game.getPlayer('user');
      const tileId = player.tiles[0].id;
      game.board.tiles[0].placed = true;
      game.board.tiles[1].placed = true;

      request(app)
        .post('/api/build-corporation')
        .send('id=1a&&corporationId=america')
        .expect('content-type', /json/)
        .expect(200, done);
    });
});

describe('POST /api/skip-build', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 1);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  const app = initApp(session('123', 'user'), games);

  before((done) => {
    request(app)
      .post('/api/start-game')
      .expect('content-type', /json/)
      .expect(200, done);
  });

  it('should skip building a corporation',
    (done) => {
      const player = game.getPlayer('user');
      const tileId = player.tiles[0].id;
      game.board.tiles[0].placed = true;
      game.board.tiles[1].placed = true;
      game.buyStocksState();

      request(app)
        .post('/api/skip-build')
        .expect('content-type', /json/)
        .expect(200,
          JSON.stringify({
            message: 'skip built corporation',
            data: { case: 'draw-tile' }
          }), done);
    });
});

describe('POST /api/buy-stocks', () => {
  const games = new Games();
  const host = { name: 'sam', id: 'user' };

  const game = newGame('123', host, 1);
  games.add(game);
  game.addPlayer(new Player('user', 'sam', game));
  const app = initApp(session('123', 'user'), games);

  beforeEach((done) => {

    request(app)
      .post('/api/start-game')
      .expect('content-type', /json/)
      .expect(200, done);
  });

  it('should buy stocks',
    (done) => {
      const corporation = game.findCorporation('america');
      corporation.active = true;
      corporation.tiles.push('1a', '1b');
      request(app)
        .post('/api/buy-stocks')
        .set('content-type', 'application/json')
        .send(JSON.stringify({
          stocks: [{
            corporationId: 'america',
            numOfStocks: 2
          }]
        }))
        .expect(200, done);
    });

  it('should buy stocks for multiple corporations',
    (done) => {
      let corporation = game.findCorporation('america');
      corporation.active = true;
      corporation.tiles.push('1a', '1b');
      corporation = game.findCorporation('zeta');
      corporation.active = true;
      corporation.tiles.push('1d', '1f');
      request(app)
        .post('/api/buy-stocks')
        .set('content-type', 'application/json')
        .send(JSON.stringify({
          stocks: [{
            corporationId: 'america',
            numOfStocks: 2
          },
          {
            corporationId: 'zeta',
            numOfStocks: 1
          }]
        }))
        .expect(200, done);
    });

  it('should not buy stocks when limit exceeds',
    (done) => {
      game.buyStocksState();
      request(app)
        .post('/api/buy-stocks')
        .set('content-type', 'application/json')
        .send(JSON.stringify({
          stocks: [{
            corporationId: 'america',
            numOfStocks: 4
          }]
        }))
        .expect(422,
          JSON.stringify({
            message: 'Can buy maximum 3 stocks',
            data: { case: 'buy-stocks' }
          }),
          done);
    });

  it('should not buy stocks in case of insufficient stocks',
    (done) => {
      const corporation = game.findCorporation('america');
      corporation.active = true;
      corporation.stocksLeft = 2;
      game.buyStocksState();

      request(app)
        .post('/api/buy-stocks')
        .set('content-type', 'application/json')
        .send(JSON.stringify({
          stocks: [{
            corporationId: 'america',
            numOfStocks: 3
          }]
        }))
        .expect(422,
          JSON.stringify({
            message: 'Inactive corporation or Insufficient stocks',
            data: { case: 'buy-stocks' }
          }),
          done);
    });

  it('should not buy stocks when coroporation is inactive',
    (done) => {
      const corporation = game.findCorporation('america');
      corporation.stocksLeft = 2;
      game.buyStocksState();

      request(app)
        .post('/api/buy-stocks')
        .set('content-type', 'application/json')
        .send(JSON.stringify({
          stocks: [{
            corporationId: 'america',
            numOfStocks: 3
          }]
        }))
        .expect(422,
          JSON.stringify({
            message: 'Inactive corporation or Insufficient stocks',
            data: { case: 'buy-stocks' }
          }),
          done);
    });

  it('should not buy stocks when player doesn\'t have sufficient money',
    (done) => {
      const corporation = game.findCorporation('america');
      const player = game.findPlayer('user');
      corporation.stocksLeft = 12;
      player.money = 200;
      game.buyStocksState();

      request(app)
        .post('/api/buy-stocks')
        .set('content-type', 'application/json')
        .send(JSON.stringify({
          stocks: [{
            corporationId: 'america',
            numOfStocks: 3
          }]
        }))
        .expect(422,
          JSON.stringify({
            message: 'Insufficient money',
            data: { case: 'buy-stocks' }
          }),
          done);
    });
});
