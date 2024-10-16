const uuid = require('uuid');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

const postUpload = (req, res) => {
  const token = req.headers['x-token'];
  if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;
  redisClient.get(key).then((userId) => {
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    dbClient.client.db('files_manager').collection('users').findOne({ _id: new ObjectId(userId) }, (err, user) => {
      if (err) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const type = ['file', 'folder', 'image'];
      const { body } = req;
      if (!body.name) {
        return res.status(400).send({ error: 'Missing name' });
      }
      if (!body.type || !type.includes(body.type)) {
        return res.status(400).send({ error: 'Missing type' });
      }

      if (!body.data && body.type !== 'folder') {
        return res.status(400).send({ error: 'Missing data' });
      }

      if (body.parentId !== undefined) {
        // TODO: check if file is present for this parentid
        return dbClient.client.db('files_manager').collection('files').findOne({ _id: new ObjectId(body.parentId) }, (err, folder) => {
          if (err) {
            return res.status(500).send({ error: 'Internal error' });
          }
          if (!folder) {
            return res.status(400).send({ error: 'Parent not found' });
          }
          if (folder && folder.type !== 'folder') {
            return res.status(400).send({ error: 'Parent is not a folder' });
          }
          return null;
        });
      }

      if (body.type === 'folder') {
        return dbClient.client.db('files_manager').collection('files').insertOne({
          ...body,
          userId: user._id,
          parentId: body.parentId === undefined ? 0 : body.parentId,
          isPublic: body.isPublic === undefined ? false : body.isPublic,
        }, (err, result) => {
          if (err) {
            return res.status(500).send({ error: 'Internal error' });
          }
          return res.status(201).send(result.ops[0]);
        });
      }

      // store all files locally in a folder
      fs.mkdirSync(`${folderPath}`, { recursive: true });
      const localPath = `${folderPath}/${uuid.v4()}`;
      fs.writeFileSync(localPath, body.data, 'base64');

      return dbClient.client.db('files_manager').collection('files').insertOne({
        userId: user._id,
        name: body.name,
        type: body.type,
        isPublic: body.isPublic === undefined ? false : body.isPublic,
        parentId: body.parentId === undefined ? 0 : body.parentId,
        localPath: body.type === 'file' || body.type === 'image' ? localPath : null,
      }, (err, file) => {
        if (err) {
          return res.status(500).send({ error: 'Internal error' });
        }
        return res.status(201).send(file.ops[0]);
      });
    });
    return null;
  });
  return null;
};

module.exports = {
  postUpload,
};
