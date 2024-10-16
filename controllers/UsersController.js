const crypto = require('crypto');
const dbClient = require('../utils/db');

const postNew = (req, res) => {
  const { body } = req;

  const { email, password } = body;

  if (!email) {
    return res.status(400).send({ error: 'email is required' });
  }
  if (!password) {
    return res.status(400).send({ error: 'Missing password' });
  }

  let theUser = null;
  dbClient.client.db('files_manager').collection('users').findOne({ email }, (err, user) => {
    if (err) {
      return res.status(500).send({ error: 'Internal error' });
    }
    theUser = user;
    return null;
  });

  if (theUser) {
    return res.status(400).send({ error: 'Already exist' });
  }

  function hashPassword(password) {
    return crypto.createHash('sha1').update(password).digest('hex');
  }

  const newUser = {
    email,
    password: hashPassword(password),
  };
  dbClient.client.db('files_manager').collection('users').insertOne(newUser, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ error: 'Internal error' });
    }
    return res.status(201).send(
      {
        email: result.ops[0].email,
        id: result.ops[0]._id,
      },
    );
  });

  return null;
};

module.exports = {
  postNew,
};
