const uuidv4 = require('uuid').v4;
const crypto = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const getConnect = (req, res) => {
  const authCookieHeader = req.headers.authorization;

  if (!authCookieHeader) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const authCookie = authCookieHeader.split(' ')[1];

  if (!authCookie) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  function hashPassword(password) {
    return crypto.createHash('sha1').update(password).digest('hex');
  }

  try {
    const [email, password] = Buffer.from(authCookie, 'base64').toString('utf8').split(':');
    if (!email || !password) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    dbClient.client.db('files_manager').collection('users').findOne({ email, password: hashPassword(password) }, (err, user) => {
      if (err || !user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const token = uuidv4();
      const key = `auth_${token}`;
      return redisClient.set(key, user._id, 60 * 60 * 24).then(() => res.status(200).send({ token })).catch(() => res.status(500).send({ error: 'Internal error' }));
    });
  } catch (err) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
  return null;
};

module.exports = {
  getConnect,
};

const getDisconnect = (req, res) => {
  const token = req.headers['x-token'];
  if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  return redisClient.get(key).then((userId) => {
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    return dbClient.client.db('files_manager').collection('users').findOne({ _id: userId }, (err, user) => {
      if (err) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      return res.status(200).send({ email: user.email, id: user._id });
    });
  });
};

module.exports = {
  getConnect,
  getDisconnect,
};
