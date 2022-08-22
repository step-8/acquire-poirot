class Logs {
  #logs;

  constructor() {
    this.#logs = [];
  }

  #addPlayerLog(playerName, message) {
    this.#logs.push(`${playerName} ${message}`);
  }

  placedTile(name, id) {
    this.#addPlayerLog(name, `placed ${id}`);
  }

  drewTile(name) {
    this.#addPlayerLog(name, 'drew a tile');
  }

  skippedBuild(name) {
    this.#addPlayerLog(name, 'skipped building corporation');
  }

  skippedBuy(name) {
    this.#addPlayerLog(name, 'skipped buying stocks');
  }

  built(name, corporation) {
    this.#addPlayerLog(name, `built ${corporation}`);
  }

  boughtStocks(name, stocks) {
    const stockLogs = stocks.map(({ corporation, numOfStocks }) => {
      return `${numOfStocks} of ${corporation}`;
    }).join(',');
    this.#addPlayerLog(name, `bought ${stockLogs}`);
  }

  merged(survivingCorporation, defunctCorporation) {
    this.#logs.push(`${survivingCorporation} acquired ${defunctCorporation}`);
  }

  declaredSafe(corporation) {
    this.#logs.push(`${corporation} is safe`);
  }

  defunctCorporation(playerName, stock) {
    const message = `have ${stock.count} of ${stock.corporationName}`;
    this.#addPlayerLog(playerName, message);
  }

  resetLogs() {
    this.#logs = [];
  }

  get logs() {
    return this.#logs;
  }
}

module.exports = { Logs };