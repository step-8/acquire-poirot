const { Games } = require('../../src/models/games');
const { newGame } = require('../../src/models/game');

const assert = require('assert');
const { Player } = require('../../src/models/player');

describe('Player', () => {
  describe('getTile', () => {
    it('should get a tile from the cluster', () => {
      const game = newGame('123', { id: '213', name: 'sam' }, 3);
      const host = new Player('213', 'sam', game);

      const player = new Player('32', 'harry', game);
      game.addPlayer(host);
      game.addPlayer(player);
      const tile = player.getTile();

      assert.ok(tile);
      assert.ok(player.tiles.find(({ id }) => id === tile.id));
      assert.ok(game.cluster.find(({ id }) => id === tile.id) === undefined);
    });
  });

  describe('placeTile', () => {
    it('should place tile from the player tiles', () => {
      const game = newGame('123', { id: '213', name: 'sam' }, 3);
      const host = new Player('213', 'sam', game);

      const player = new Player('32', 'harry', game);
      game.addPlayer(host);
      game.addPlayer(player);
      const tile = player.getTile();
      player.placeTile();

      assert.ok(player.tiles.find(({ id }) => id === tile.id) === undefined);
      assert.ok(game.cluster.find(({ id }) => id === tile.id) === undefined);
      assert.ok(game.board.tiles.find(({ id }) =>
        tile.id === id).placed === true);
    });
  });
});
