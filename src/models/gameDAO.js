const createPlayerDAO = (player = {}) => {
  return { id: player.id, name: player.name };
};

const createPlayersDAO = (game) => {
  return game.players.map(createPlayerDAO);
};

const createTurnDAO = (stage, player = {}, mergingCorporations = {}) => {
  return { stage, playerId: player.id, mergingCorporations };
};

const createCurrentPlayerDAO = (player) => {
  return { ...player, tiles: player.tiles };
};

const createGameDAO = (game, playerId) => {
  const gameDAO = {
    player: createCurrentPlayerDAO(game.getPlayer(playerId)),
    players: createPlayersDAO(game),
    board: game.board,
    cluster: game.cluster,
    logs: game.logs.logs,
    corporations: game.corporations,
    gameSize: game.gameSize,
    started: game.started,
    informationCard: game.informationCard,
    turn: createTurnDAO(game.stage, game.currentPlayer, game.getMergingCorporations()),
  };
  return gameDAO;
};

module.exports = { createGameDAO };
