class Player {
  constructor(id, name, game) {
    this.id = id;
    this.name = name;
    this.game = game;
    this.tiles = [];
    this.money = 0;
    this.stocks = [];
  }

  removeTile(id) {
    this.tiles = this.tiles.filter(tile => tile.id !== id);
  }

  addTile(tile) {
    this.tiles.push(tile);
  }

  placeFirstTile() {
    const [tile] = this.tiles;
    this.tiles.splice(0, 1);
    return tile;
  }

  skipBuild() {
    this.game.logs.push(`${this.name} skipped building corporation`);
  }

  skipBuy() {
    this.game.logs.push(`${this.name} skipped buying stocks`);
  }

  addStocks({ id, name }, noOfStocks = 0) {
    const stocks = this.stocks.find(stock => stock.corporationId === id);

    if (stocks) {
      stocks.count += noOfStocks;
      return;
    }

    this.stocks.push({ corporationId: id, corporationName: name, count: noOfStocks });
  }

  deductMoney(toBeDeducted) {
    this.money -= toBeDeducted;
  }

  addMoney(toBeAdded) {
    this.money += toBeAdded;
  }

  getMoney() {
    return this.money;
  }
}

module.exports = { Player };
