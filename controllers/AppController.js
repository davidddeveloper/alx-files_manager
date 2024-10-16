const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const getStatus = (req, res) => {
  res.send(
    {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    },
  );
};

const getStats = async (req, res) => {
  res.send({
    users: await dbClient.nbUsers(),
    files: await dbClient.nbFiles(),
  });
};

module.exports = {
  getStatus,
  getStats,
};
