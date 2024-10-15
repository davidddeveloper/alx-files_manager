const dbClient = require('../utils/db').default;
const redisClient = require('../utils/redis').default;

const getStatus = (req, res) => {
  res.send(
    {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    },
  );
};

const getStats = (req, res) => {
  res.send({
    users: dbClient.nbUsers(),
    files: dbClient.nbFiles(),
  });
};

module.exports = {
  getStatus,
  getStats,
};
