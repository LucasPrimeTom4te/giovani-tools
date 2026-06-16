const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

let data = {};

function load() {
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    data = {};
  }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const storage = {
  getItem(key) {
    load();
    return data[key] ?? null;
  },

  setItem(key, value) {
    load();
    data[key] = value;
    save();
  },

  removeItem(key) {
    load();
    delete data[key];
    save();
  },

  getAll() {
    load();
    return data;
  },

  clear() {
    data = {};
    save();
  },
};

load();

module.exports = storage;
