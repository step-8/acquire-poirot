const { createGameDAO } = require('../models/gameDAO.js');
const { nextStep } = require('../utils/game.js');

const loadGame = (req, res) => {
  const { game, session: { playerId } } = req;

  if (!game) {
    return res.status(404).render('notFound', { isNotFoundPage: false });
  }

  res.json({ game: createGameDAO(game, playerId) });
};

const startGame = (req, res) => {
  const { game } = req;

  if (game.hasStarted()) {
    return res.status(400).json({ message: 'game has already started' });
  }

  if (!game.isHost(req.session.playerId)) {
    return res.status(400).json({ message: 'Only host can start game' });
  }

  game.setup();
  game.start();

  res.json({ message: 'success' });
};

const drawTile = (req, res) => {
  const { game } = req;
  const { playerId } = req.session;

  if (game.isPlayerIdle(playerId)) {
    return res.status(400).json({ message: 'Can\'t draw a tile' });
  }

  game.determineDeadTiles();
  const tile = game.drawTile();
  res.json({ data: tile, message: 'Drawn a tile' });
};

const placeTile = (req, res) => {
  const {
    game,
    body: { id },
    session: { playerId }
  } = req;

  if (!game.isInPlaceTileStage()) {
    return res.status(422).json({
      data: {
        message: 'tile can not be placed',
        case: game.stage
      }
    });
  }

  const player = game.getPlayer(playerId);
  if (!player.findTile(id)) {
    return res.status(422).json({
      data: {
        message: 'tile doesn\'t belongs to you',
        case: game.stage,
      }
    });
  }
  const tile = game.placeTile({ id });
  const { step, tiles, corporations } = nextStep(game, id);

  if (step === 'grow') {
    const [corporation] = corporations;
    game.expandCorporation(corporation.id, tiles);
    game.determineSafe(corporation);
  }
  if (step === 'merge') {
    game.merge(corporations, tiles);
    game.transactionState();
    corporations.forEach(corporation => game.determineSafe(corporation));
  }

  res.json({
    data: {
      tile, case: game.stage,
      corporations: game.corporations,
      currentPlayer: game.currentPlayer,
      money: player.money,
      mergingCorporations: game.getMergingCorporations()
    }, message: 'placed tile'
  });
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
    body: { stocks }
  } = req;

  if (!game.isInBuyStage()) {
    res.status(422).json({
      message: 'Stocks can not be bought',
      data: { case: game.stage }
    });
    return;
  }

  if (!isValidStockCount(stocks)) {
    res.status(422).json({
      message: 'Can buy maximum 3 stocks',
      data: { case: game.stage }
    });
    return;
  }

  if (!areStocksAvailable(game, stocks)) {
    res.status(422).json({
      message: 'Inactive corporation or Insufficient stocks',
      data: { case: game.stage }
    });
    return;
  }

  if (!game.isMoneySufficient(playerId, stocks)) {
    res.status(422).json({
      message: 'Insufficient money',
      data: { case: game.stage }
    });
    return;
  }

  game.drawTileState();

  game.sellStocks(stocks, playerId);
  res.json({ message: 'Bought stocks', data: { case: game.stage } });
};

const buildCorporation = (req, res) => {
  const {
    game,
    body: { id, corporationId }
  } = req;

  if (!game.isInBuildStage()) {
    res.status(422).json({
      message: 'Corporation can not be built',
      data: { case: game.stage }
    });
    return;
  }
  if (game.isBuilt(corporationId)) {
    res.status(422).json({
      message: 'Corporation is already built',
      data: { case: game.stage }
    });
    return;
  }

  const corporation = game.buildCorporation(corporationId, id);
  if (game.canStocksBeBought()) {
    game.buyStocksState();
  } else {
    game.drawTileState();
  }

  res.json({
    message: 'built corporation',
    data: { corporation, case: game.stage }
  });
};

const skipBuildCorp = (req, res) => {
  const { game } = req;

  game.skipBuild();
  if (game.canStocksBeBought()) {
    game.buyStocksState();
  } else {
    game.drawTileState();
  }

  res.json({
    message: 'skip built corporation',
    data: { case: game.stage }
  });
};

const skipBuyStocks = (req, res) => {
  const { game } = req;

  game.skipBuy();
  game.drawTileState();

  res.json({
    message: 'skip buying stocks',
    data: { case: game.stage }
  });
};

const handleDefunctStocks = (req, res) => {
  const { game, body } = req;
  const stockCount = parseInt(body.stockCount);
  const tradeCount = parseInt(body.tradeCount);

  const validationResult = game.validateStocks(stockCount, tradeCount);

  if (validationResult) {
    res.status(422).json({
      message: validationResult.message,
      data: { case: 'transaction' }
    });
    return;
  }
  game.sellDefunctStocks({ stockCount, tradeCount });
  res.json({
    message: 'sold stocks',
    data: { case: 'polling' }
  });
};

const endGame = (req, res) => {
  const { game } = req;
  const endGameStats = game.getEndGameStats();
  const winner = game.getWinner();

  const players = game.players.map(({ id }) => {
    const player = game.getPlayer(id);
    return { ...player, name: player.name };
  });

  res.json({
    message: 'game ended',
    data: { endGameStats, players, winner }
  });
};

const authorizeRequest = (req, res, next) => {
  const { game, session: { playerId } } = req;
  if (game.isPlayerIdle(playerId)) {
    res.status(403).json({ message: 'Invalid request' });
    return;
  }
  next();
};

module.exports = {
  loadGame,
  startGame,
  drawTile,
  placeTile,
  changeTurn,
  buildCorporation,
  buyStocks,
  totalNumOfStocks,
  areStocksAvailable,
  skipBuildCorp,
  skipBuyStocks,
  handleDefunctStocks,
  authorizeRequest,
  endGame
};
