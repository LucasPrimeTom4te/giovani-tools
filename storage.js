const { MongoClient } = require('mongodb');

let client;
let db;

async function connect() {
  if (db) return db;
  if (!client) {
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
  }
  db = client.db('giovani-tools');
  return db;
}

const storage = {
  async getItem(key) {
    const database = await connect();
    const doc = await database.collection('keyvalue').findOne({ key });
    return doc ? doc.value : null;
  },

  async setItem(key, value) {
    const database = await connect();
    await database.collection('keyvalue').updateOne(
      { key },
      { $set: { key, value } },
      { upsert: true }
    );
  },

  async removeItem(key) {
    const database = await connect();
    await database.collection('keyvalue').deleteOne({ key });
  },
};

module.exports = storage;
