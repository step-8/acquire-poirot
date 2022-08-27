const { defunctStockHolder } = require('../utils/game.js');

const isOdd = (num) => num % 2 !== 0;

class MergeState {
  constructor(game,
    { defunctCorp, acquiringCorp },
    tiles,
    mergeMaker) {

    this.game = game;
    this.defunctCorp = defunctCorp;
    this.acquiringCorp = acquiringCorp;
    this.tiles = tiles;
    this.mergeMaker = mergeMaker;
    this.count = 0;
    this.stockHolders = [];
  }

  reorderPlayers() {
    const gamePlayers = this.game.players;
    const mergeMakerPosition = gamePlayers.findIndex(player => {
      return this.mergeMaker.isSame(player.id);
    });

    const players = gamePlayers.slice(mergeMakerPosition);
    return players.concat(gamePlayers.slice(0, mergeMakerPosition));
  }

  findStockHolders(players) {
    return players.filter(player => player.findStocks(this.defunctCorp.id));
  }

  addStockHolders() {
    const orderedPlayers = this.reorderPlayers();
    this.stockHolders = this.findStockHolders(orderedPlayers);
  }

  changeTurn() {
    const stockHolderId = this.stockHolders[this.count].id;
    const player = this.game.getPlayer(stockHolderId);
    this.game.transactionState();
    this.game.currentPlayer = player;
    this.count++;
  }

  validateStocks(stockCount, tradeCount) {
    if (isOdd(tradeCount)) {
      return { message: 'You can only trade even number of stocks' };
    }

    if (!this.acquiringCorp.areStocksAvailable(tradeCount / 2)) {
      return { message: 'Acquiring corporation has insufficient stocks' };
    }

    const player = this.game.currentPlayer;
    const valid = player.hasStocks(this.defunctCorp, stockCount + tradeCount);
    if (!valid) {
      return { message: 'Insufficient stocks' };
    }
  }

  canMergeMakerSell() {
    return this.mergeMaker.hasStocks(this.defunctCorp, 1);
  }

  updateCorporationPrices() {
    const acquiringCorpMarketPrice = this.game.marketPrice(this.acquiringCorp);
    this.defunctCorp.updateMarketPrice({});
    this.acquiringCorp.updateMarketPrice(acquiringCorpMarketPrice);
  }

  merge() {
    this.defunctCorp.defunct();
    this.acquiringCorp.grow(this.tiles);
    this.updateCorporationPrices();
  }

  nextState() {
    if (this.game.canStocksBeBought()) {
      this.game.buyStocksState();
      return;
    }
    this.game.drawTileState();
  }

  next() {
    if (this.count >= this.stockHolders.length) {
      this.game.currentPlayer = this.mergeMaker;
      this.merge();
      this.nextState();
      return;
    }
    this.changeTurn();
  }

  tradeStocks(tradeCount) {
    const acquiringStocks = tradeCount / 2;

    this.acquiringCorp.reduceStocks(acquiringStocks);
    this.defunctCorp.addStocks(tradeCount);
    this.game.currentPlayer.addStocks(this.acquiringCorp, acquiringStocks);
    this.game.currentPlayer.reduceStocks(this.defunctCorp, tradeCount);
  }

  handleDefunctStocks({ stockCount, tradeCount }) {
    this.sellStocks(stockCount);
    this.tradeStocks(tradeCount);
    this.next();
  }

  sellStocks(stockCount) {
    const player = this.game.currentPlayer;
    player.reduceStocks(this.defunctCorp, stockCount);
    this.defunctCorp.addStocks(stockCount);
    const { stockPrice } = this.game.marketPrice(this.defunctCorp);
    player.addMoney(stockPrice * stockCount);
  }
}

module.exports = { MergeState };
