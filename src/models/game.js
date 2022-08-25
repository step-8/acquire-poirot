const lodash = require('lodash');
const { Corporation } = require('./corporation.js');
const { MergeState } = require('./mergeState.js');
const { createBoard } = require('./board.js');
const {
  findTilesChain,
  sortCorporations, createTiles, randomInt,
  defunctStockHolder,
  computeBonus,
  areCorporationsSafe,
  hasMoreThan40Tiles
} = require('../utils/game.js');
const informationCard = require('../../resources/informationCard.json');
const { Logs } = require('./log.js');
const { Player } = require('./player.js');

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
  #players;
  #stage;

  constructor({ id,
    players,
    board,
    cluster,
    corporations,
    host,
    gameSize,
    informationCard,
    logs,
    currentPlayer,
    started,
    stage
  }) {
    this.id = id;
    this.#players = players;
    this.board = board;
    this.cluster = cluster;
    this.corporations = corporations;
    this.host = host;
    this.gameSize = gameSize;
    this.#stage = stage;
    this.logs = logs;
    this.started = started;
    this.informationCard = informationCard;
    this.currentPlayer = currentPlayer;
  }

  #drawInitialTiles() {
    this.players.forEach(player => {
      this.logs.drewTile(player.name);
      this.giveTile(player);
    });
  }

  #reorder() {
    const playersTiles = this.players.map(player => player.tiles[0]);
    const nearestTile = findNearestTile(playersTiles);
    const nearestTilePos = playersTiles.findIndex((tile) => tile.id === nearestTile.id);
    this.#players = this.players.slice(nearestTilePos).concat(this.players.slice(0, nearestTilePos));
  }

  setup() {
    this.#drawInitialTiles();
    this.#reorder();
    this.players.forEach(player => {
      const tile = player.placeFirstTile();
      this.board.placeTile(tile.id);
      this.logs.placedTile(player.name, tile.id);
      player.addMoney(6000);

      for (let index = 0; index < 6; index++) {
        this.giveTile(player);
      }
    });
  }

  start() {
    this.started = true;
    this.currentPlayer = this.players[0];
    this.#stage = 'place-tile';
  }

  addPlayer(player) {
    this.#players.push(player);
  }

  findCorporation(corporationId) {
    return this.corporations.find(({ id }) => id === corporationId);
  }

  isGameOver() {
    const activeCorporations = this.getActiveCorporations();
    return areCorporationsSafe(activeCorporations) ||
      hasMoreThan40Tiles(activeCorporations);
  }

  changeTurn(stage = 'place-tile') {
    if (this.isGameOver()) {
      this.endGameState();
      this.currentPlayer = undefined;
      return;
    }

    const currentPlayerPosition = this.#players.findIndex(player => {
      return this.currentPlayer.isSame(player.id);
    });

    const totalPlayers = this.#players.length;
    const nextPlayerPosition = (currentPlayerPosition + 1) % totalPlayers;
    this.currentPlayer = this.#players[nextPlayerPosition];
    this.#stage = stage;
  }

  isPlayerIdle(playerId) {
    return !this.currentPlayer.isSame(playerId);
  }

  hasStarted() {
    return this.started;
  }

  isHost(playerId) {
    return this.host.id === playerId;
  }

  giveTile(player) {
    const tileIndex = randomInt(this.cluster.length);
    const tile = this.cluster[tileIndex];

    this.cluster.splice(tileIndex, 1);
    player.addTile(tile);
    return tile;
  }

  placeTile({ id }) {
    this.logs.resetLogs();
    this.currentPlayer.removeTile(id);
    const tile = this.board.placeTile(id);
    this.logs.placedTile(this.currentPlayer.name, id);
    return tile;
  }

  drawTile() {
    this.logs.drewTile(this.currentPlayer.name);
    return this.giveTile(this.currentPlayer);
  }

  marketPrice(corporation) {
    const corporationSize = corporation.getSize();

    const corporationColumn = this.informationCard.find(column =>
      column.corporations.includes(corporation.id));

    const priceBySize = corporationColumn.pricesBySize.find(({ range }) => {
      return isBetween(corporationSize, range);
    });

    const { majority, minority, stockPrice } = priceBySize;
    return { minorityBonus: minority, majorityBonus: majority, stockPrice };
  }

  expandCorporation(corporationId, tiles) {
    const corporation = this.findCorporation(corporationId);
    corporation.grow(tiles);
    corporation.updateMarketPrice(this.marketPrice(corporation));
  }

  sellStocks(stocks) {
    const logsData = [];

    stocks.forEach(({ corporationId, numOfStocks }) => {
      const corporation = this.findCorporation(corporationId);
      corporation.reduceStocks(numOfStocks);
      this.currentPlayer.addStocks(corporation, numOfStocks);
      const { stockPrice } = this.marketPrice(corporation);

      this.currentPlayer.deductMoney(stockPrice * numOfStocks);
      logsData.push({ numOfStocks, corporation: corporation.name });
    });
    this.logs.boughtStocks(this.currentPlayer.name, logsData);
  }

  choosenStocksCost(stocks) {
    return stocks.reduce((requireMoney, { corporationId, numOfStocks }) => {
      const corporation = this.findCorporation(corporationId);
      const { stockPrice } = this.marketPrice(corporation);
      const currCorpCost = stockPrice * numOfStocks;
      return requireMoney + currCorpCost;
    }, 0);
  }

  isMoneySufficient(playerId, stocks) {
    const playerMoney = this.getPlayer(playerId).getMoney();
    const requiredMoney = this.choosenStocksCost(stocks);
    return playerMoney >= requiredMoney;
  }

  getPlayer(playerId) {
    return this.#players.find(player => player.id === playerId);
  }

  playerExists(playerId) {
    return this.getPlayer(playerId) ? true : false;
  }

  buildCorporation(corporationId, tileId) {
    const corporation = this.findCorporation(corporationId);

    const tiles = findTilesChain(tileId, this.board.tiles);
    corporation.addTiles(tiles);
    corporation.activate();
    corporation.updateMarketPrice(this.marketPrice(corporation));

    const stocksCount = 1;
    if (corporation.areStocksAvailable(stocksCount)) {
      this.currentPlayer.addStocks(corporation, stocksCount);
      corporation.reduceStocks(stocksCount);
    }

    this.logs.built(this.currentPlayer.name, corporation.name);
    return corporation;
  }

  determineSafe(corporation) {
    if (corporation.isSafe()) {
      this.logs.declaredSafe(corporation.name);
    }
  }
  placeTileStage() {
    this.#stage = 'place-tile';
  }

  buildState() {
    this.#stage = 'build';
  }

  mergeState() {
    this.#stage = 'merge';
  }

  transactionState() {
    this.#stage = 'transaction';
  }

  buyStocksState() {
    this.#stage = 'buy-stocks';
  }

  drawTileState() {
    this.#stage = 'draw-tile';
  }

  endGameState() {
    this.#stage = 'end-game';
  }

  isInEndGameStage() {
    return this.#stage === 'end-game';
  }

  isAnyCorporationActive() {
    return this.corporations.some(corporation => corporation.active);
  }

  isAnyCorporationInactive() {
    return this.corporations.some(corporation => !corporation.active);
  }

  getActiveCorporations() {
    return this.corporations.filter(corporation => corporation.active);
  }

  skipBuy() {
    this.logs.skippedBuy(this.currentPlayer.name);
  }

  skipBuild() {
    this.logs.skippedBuild(this.currentPlayer.name);
  }

  // merge corporations ---------

  #distributeBonus(stockHolders) {
    if (!stockHolders) {
      return;
    }
    stockHolders.forEach(({ id, money }) => {
      const player = this.getPlayer(id);
      if (player) {
        player.money += money;
      }
    });
  }

  updateDefunctLogs(stockHolders) {
    stockHolders.forEach(({ id, stock }) => {
      const player = this.getPlayer(id);
      this.logs.defunctCorporation(player.name, stock);
    });
  }

  updateBonusLogs(defunctShareHolders) {
    defunctShareHolders.forEach(({ id, money, bonusType }) => {
      const player = this.getPlayer(id);
      this.logs.bonusDistribution(player.name, money, bonusType);
    });
  }

  merge(corporations, tiles) {
    const [defunctCorp, acquiringCorp] = sortCorporations(corporations);
    this.logs.merged(acquiringCorp.name, defunctCorp.name);

    const stockHolders = defunctStockHolder(this.#players, defunctCorp.id);
    const bonus = this.marketPrice(defunctCorp);
    const defunctShareHolders = computeBonus(stockHolders, bonus);

    this.#distributeBonus(defunctShareHolders);
    this.updateDefunctLogs(stockHolders);
    this.updateBonusLogs(defunctShareHolders);
    this.state = new MergeState(this, defunctCorp, acquiringCorp, tiles);
  }

  sellDefunctStocks(stockCount) {
    this.state.sellStocks(stockCount);
  }

  isValidStockCount(stockCount) {
    return this.state.isValidStockCount(stockCount);
  }

  addStocks({ id }, stockCount) {
    const corporation = this.findCorporation(id);
    corporation.addStocks(stockCount);
  }

  accept(visitor) {
    visitor.visit(this);
    this.corporations.forEach(corporation => corporation.accept(visitor));
    this.players.forEach(player => player.accept(visitor));
    this.board.accept(visitor);
    this.logs.accept(visitor);
  }

  getState() {
    return {
      id: this.id,
      cluster: this.cluster,
      gameSize: this.gameSize,
      host: this.host,
      currentPlayer: this.currentPlayer.getState(),
      informationCard: this.informationCard,
      stage: this.#stage,
      started: this.started
    };
  }
  // getters ---------------
  get players() {
    return this.#players;
  }

  get stage() {
    return this.#stage;
  }
}

const createCorporations = (corporations) => {
  const corps = corporations ? corporations : [
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
      id: 'phoenix',
      name: 'Phoenix'
    },
    {
      id: 'sackson',
      name: 'Sackson'
    }
  ];

  return corps.map(corporation =>
    new Corporation(corporation));
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
    informationCard,
    logs: new Logs()
  });
};

const playerInstances = (players) => players.map(player => new Player(player));

const restoreGame = (game) => {
  const board = createBoard(game.board);
  const corporations = createCorporations(game.corporations);
  const players = playerInstances(game.players);

  return new Game({
    ...game,
    players,
    corporations,
    board,
    currentPlayer: new Player(game.currentPlayer),
    logs: new Logs(game.logs)
  });
};

module.exports = { Game, newGame, createCorporations, restoreGame };
