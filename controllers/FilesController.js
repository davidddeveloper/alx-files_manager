const uuid = require('uuid');
const mime = require('mime-types');
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

const getShow = (req, res) => {
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

      if (!user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      dbClient.client.db('files_manager').collection('files').find({ _id: new ObjectId(id) }).toArray((err, files) => {
        if (err) {
          return res.status(500).send({ error: 'Internal error' });
        }
        if (!files || files.length === 0) {
          return res.status(404).send({ error: 'Not found' });
        }
        if (!files[0] || files[0].userId.toString() !== user._id.toString()) {
          return res.status(404).send({ error: 'Not found' });
        }
        return res.status(200).send(files[0]);
      });
      return null;
    });
    return null;
  });
  return null;
};

const getIndex = (req, res) => {
  const token = req.headers['x-token'];
  if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;
  redisClient.get(key).then((userId) => {
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { parentId = 0, page = 0 } = req.query;
    const pageSize = 20;
    const skip = parseInt(page, 10) * pageSize;

    return dbClient.client.db('files_manager').collection('files').aggregate([
      { $match: { parentId, userId: new ObjectId(userId) } },
      { $skip: skip },
      { $limit: pageSize },
    ]).toArray((err, files) => {
      if (err) {
        return res.status(500).send({ error: 'Internal error' });
      }
      return res.status(200).send(files);
    });
  }).catch(() => res.status(500).send({ error: 'Internal error' }));
  return null;
};

const putPublish = (req, res) => {
  const token = req.headers['x-token'];
  if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;
  redisClient.get(key).then((userId) => {
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    return dbClient.client.db('files_manager').collection('files').findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) }, (err, file) => {
      if (err) {
        return res.status(500).send({ error: 'Internal error' });
      }
      if (!file) {
        return res.status(404).send({ error: 'Not found' });
      }

      return dbClient.client.db('files_manager').collection('files').updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: true } }, (err, fileUpdated) => {
        if (err) {
          return res.status(500).send({ error: 'Internal error' });
        }
        return res.status(200).send(fileUpdated);
      });
    });
  }).catch(() => res.status(500).send({ error: 'Internal error' }));
  return null;
};

const putUnpublish = (req, res) => {
  const token = req.headers['x-token'];
  if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;
  redisClient.get(key).then((userId) => {
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    return dbClient.client.db('files_manager').collection('files').findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) }, (err, file) => {
      if (err) {
        return res.status(500).send({ error: 'Internal error' });
      }
      if (!file) {
        return res.status(404).send({ error: 'Not found' });
      }

      return dbClient.client.db('files_manager').collection('files').updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: false } }, (err, fileUpdated) => {
        if (err) {
          return res.status(500).send({ error: 'Internal error' });
        }
        return res.status(200).send(fileUpdated);
      });
    });
  }).catch(() => res.status(500).send({ error: 'Internal error' }));
  return null;
};

const getFile = (req, res) => {
  const { id } = req.params;
  dbClient.client.db('files_manager').collection('files').findOne({ _id: new ObjectId(id) }, (err, file) => {
    if (err) {
      return res.status(500).send({ error: 'Internal error' });
    }
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }
    redisClient.get(`auth_${req.headers['x-token']}`).then((userId) => {
      if (!file.isPublic && userId !== file.userId.toString()) {
        return res.status(404).send({ error: 'Not found' });
      }
      return null;
    })
    if (file.type === 'folder') {
      return res.status(400).send({ error: "A folder doesn't have content" });
    }
    const filePath = `${folderPath}/${file.localPath}`;
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).send({ error: 'Not found' });
      }
      // If file exists, continue with further processing
      return res.status(200).send(file);
    });
    const mimeType = mime.lookup(file.localPath);
    if (!mimeType) {
      return res.status(500).send({ error: 'Internal error' });
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    return res.status(200).send(file);
  });
  return null;
};

module.exports = {
  postUpload,
  getShow,
  getIndex,
  putPublish,
  putUnpublish,
  getFile,
};
