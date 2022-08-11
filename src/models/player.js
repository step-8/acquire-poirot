const randomInt = (limit) => {
  return Math.round(Math.random() * limit);
};

class Player {
  constructor(id, name, game) {
    this.id = id;
    this.name = name;
    this.game = game;
    this.tiles = [];
    this.money = 0;
  }

  drawTile() {
    const tilePos = randomInt(this.game.cluster.length);
    const tile = this.game.cluster[tilePos];
    this.game.cluster.splice(tilePos, 1);
    this.tiles.push(tile);
    this.game.logs.push(`${this.name} drew a tile`);

    return tile;
  }

  placeFirstTile() {
    const [tile] = this.tiles;
    this.game.board.placeTile(tile);
    this.game.logs.push(`${this.name} placed ${tile.id}`);
    this.tiles.splice(0, 1);
  }

  placeTile(tile) {
    this.game.board.placeTile(tile);
    this.game.logs.push(`${this.name} placed ${tile.id}`);
    this.tiles.splice(0, 1);
  }
}

module.exports = { Player };
