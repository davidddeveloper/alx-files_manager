import MongoClient from 'mongodb/lib/mongo_client';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    this.client = MongoClient(`mongodb://${host}:${port}/${database}`);

    // connect to mongodb
    this.client.connect();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const users = await this.client.db('files_manager').collection('users').countDocuments();
    return users;
  }

  async nbFiles() {
    const files = await this.client.db('files_manager').collection('files').countDocuments();
    return files;
  }
}

const dbClient = new DBClient();
export default dbClient;
