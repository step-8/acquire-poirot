const randomInt = (limit) => {
  return Math.round(Math.random() * limit);
};

class Player {
  constructor(id, name, game) {
    this.id = id;
    this.name = name;
    this.game = game;
    this.tiles = [];
  }

  getTile() {
    const tilePos = randomInt(this.game.cluster.length);
    const tile = this.game.cluster[tilePos];
    this.game.cluster.splice(tilePos, 1);
    this.tiles.push(tile);
  }

  placeTile() {
    const [tile] = this.tiles;
    this.game.board.placeTile(tile);
    this.tiles.splice(0, 1);
  }
}

module.exports = { Player };
