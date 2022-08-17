const { createGameDAO } = require('../models/gameDAO.js');
const { getPlayer, getInitialTiles, nextMove } = require('../utils/game.js');

const loadGame = (req, res) => {
  const { game, session: { playerId } } = req;

  if (!game) {
    return res.status(404).send('Game not found');
  }

  res.json({ game: createGameDAO(game, playerId) });
};

const startGame = (req, res) => {
  const { game } = req;

  if (game.host.id !== req.session.playerId) {
    return res.status(400).json({ message: 'Only host can start game' });
  }

  game.players.forEach(player => player.drawTile());

  game.reorder();

  game.players.forEach(player => {
    player.placeFirstTile();
    player.money = 6000;
    getInitialTiles(player);
  });

  game.start();

  res.json({ message: 'success' });
};

const drawTile = (req, res) => {
  const { game } = req;
  const { playerId } = req.session;

  if (game.isPlayerIdle(playerId)) {
    return res.status(400).json({ message: 'Can\'t draw a tile' });
  }

  const tile = game.currentPlayer.drawTile();
  res.json({ data: tile, message: 'Drawn a tile' });
};

const placeTile = (req, res) => {
  const {
    game,
    session: { playerId },
    body: { id }
  } = req;

  const player = getPlayer(game.players, playerId);

  const nextStep = nextMove(game, id);
  const tile = player.placeTile({ id });
  res.json({ data: tile, message: 'success', case: nextStep.case });
};

const changeTurn = (req, res) => {
  const { game } = req;
  game.changeTurn();
  res.json({ message: 'success' });
};

const totalNumOfStocks = (stocks) => {
  return stocks.reduce((totalNumOfStocks, { numOfStocks }) => {
    return totalNumOfStocks + numOfStocks;
  }, 0);
};

const areStocksAvailable = (game, stocks) => {
  return stocks.every(({ corporationId, numOfStocks }) => {
    const corporation = game.findCorporation(corporationId);
    return corporation.areStocksAvailable(numOfStocks) && corporation.active;
  });
};

const isValidStockCount = (stocks) => {
  return totalNumOfStocks(stocks) < 4;
};

const buyStocks = (req, res) => {
  const {
    game,
    session: { playerId },
  } = req;
  const stocks = JSON.parse(req.body.stocks);

  if (!isValidStockCount(stocks)) {
    res.status(422).json({ message: 'Can buy maximum 3 stocks' });
    return;
  }

  if (!areStocksAvailable(game, stocks)) {
    res.status(422).json({ message: 'Inactive corporation or Insufficient stocks' });
    return;
  }

  game.sellStocks(stocks, playerId);
  res.end('hello');
};

module.exports = { loadGame, startGame, drawTile, placeTile, changeTurn, buyStocks, totalNumOfStocks, areStocksAvailable };
