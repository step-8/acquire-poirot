const lodash = require('lodash');
const { Corporation } = require('./corporation.js');
const { createBoard } = require('./board.js');
const { createTiles } = require('../utils/createTiles.js');
const { findTilesChain } = require('../utils/game.js');
const { informationCard } = require('./informationCard.js');

const getSameRowTiles = (letter, tiles) => {
  return tiles.filter(tile => tile.id.includes(letter));
};

const isBetween = (number, { min, max }) => number >= min && number <= max;

const findNearestTile = (tiles) => {
  const sortedTilesByLetter = lodash.sortBy(tiles, ({ id }) => {
    const letter = id.slice(-1);
    return letter;
  });

  const nearestLetter = sortedTilesByLetter[0].id.slice(-1);
  const sameRowTiles = getSameRowTiles(nearestLetter, sortedTilesByLetter);
  const sortedTiles = lodash.sortBy(sameRowTiles, ({ id }) => {
    const num = +id.slice(0, id.length - 1);
    return num;
  });
  return sortedTiles[0];
};

class Game {
  constructor({ id,
    players,
    board,
    cluster,
    corporations,
    host,
    gameSize,
    informationCard
  }) {
    this.id = id;
    this.players = players;
    this.board = board;
    this.cluster = cluster;
    this.corporations = corporations;
    this.host = host;
    this.gameSize = gameSize;
    this.logs = [];
    this.started = false;
    this.informationCard = informationCard;
  }

  start() {
    this.started = true;
  }

  addPlayer(player) {
    this.players.push(player);
  }

  getPlayers() {
    return this.players;
  }

  findCorporation(corporationId) {
    return this.corporations.find(({ id }) => id === corporationId);
  }

  findPlayer(playerId) {
    return this.players.find(({ id }) => id === playerId);
  }

  reorder() {
    const playersTiles = this.players.map(player => player.tiles[0]);
    const nearestTile = findNearestTile(playersTiles);
    const nearestTilePos = playersTiles.findIndex((tile) => tile.id === nearestTile.id);
    this.players = this.players.slice(nearestTilePos).concat(this.players.slice(0, nearestTilePos));
    this.currentPlayer = this.players[0];
  }

  changeTurn() {
    const currentPlayerPosition = this.players.findIndex(player => {
      return player.id === this.currentPlayer.id;
    });
    const totalPlayers = this.players.length;
    const nextPlayerPosition = (currentPlayerPosition + 1) % totalPlayers;
    this.currentPlayer = this.players[nextPlayerPosition];
  }

  isPlayerIdle(playerId) {
    return this.currentPlayer.id !== playerId;
  }

  hasStarted() {
    return this.started;
  }

  calculateStockPrice(corporation) {
    const corporationSize = corporation.getSize();

    const corporationColumn = this.informationCard.find(column =>
      column.corporations.includes(corporation.id));

    const priceBySize = corporationColumn.pricesBySize.find(({ range }) => {
      return isBetween(corporationSize, range);
    });
    return priceBySize.stockPrice;
  }

  sellStocks(stocks, playerId) {
    const player = this.findPlayer(playerId);
    const stockLogs = [];

    stocks.forEach(({ corporationId, numOfStocks }) => {
      const corporation = this.findCorporation(corporationId);
      corporation.reduceStocks(numOfStocks);
      player.addStocks(corporation, numOfStocks);
      player.deductMoney(this.calculateStockPrice(corporation) * numOfStocks);
      stockLogs.push(`${numOfStocks} stocks of ${corporation.name}`);
    });
    this.logs.push(`${player.name} bought ` + stockLogs.join(', '));
  }

  getPlayer(playerId) {
    return this.players.find(player => player.id === playerId);
  }

  getCorporation(corporationId) {
    return this.corporations.find(corporation =>
      corporation.id === corporationId);
  }

  buildCorporation(corporationId, tileId, playerId) {
    const corporation = this.getCorporation(corporationId);
    const player = this.getPlayer(playerId);

    const tiles = findTilesChain(tileId, this.board.tiles);
    corporation.addTiles(tiles);
    corporation.activate();

    const stocksCount = 1;
    if (corporation.areStocksAvailable(stocksCount)) {
      player.addStocks(corporation, stocksCount);
      corporation.reduceStocks(stocksCount);
    }
    this.logs.push(`${player.name} built ${corporation.name} on ${tileId}`);

    return corporation;
  }
}

const createCorporations = () => {
  const corporations = [
    {
      id: 'america',
      name: 'America'
    },
    {
      id: 'hydra',
      name: 'Hydra'
    },
    {
      id: 'fusion',
      name: 'Fusion'
    },
    {
      id: 'zeta',
      name: 'Zeta'
    },
    {
      id: 'quantum',
      name: 'Quantum'
    },
    {
      id: 'phoneix',
      name: 'Phoneix'
    },
    {
      id: 'sackson',
      name: 'Sackson'
    }
  ];

  return corporations.map(corporation =>
    new Corporation(
      corporation.id,
      corporation.name
    ));
};

const newGame = (id, host, gameSize) => {
  const board = createBoard();
  const cluster = createTiles();
  const corporations = createCorporations();

  return new Game({
    id,
    host,
    players: [],
    board,
    cluster,
    corporations,
    gameSize,
    informationCard
  });
};

module.exports = { Game, newGame, createCorporations };
