import fs from 'node:fs';
import path from 'node:path';
import { DATA_FILE } from '../config/paths.js';
import { buildSeed, SEED_VERSION } from '../data/seedData.js';

/**
 * MODELO base de datos.
 * Persistencia local sobre un archivo JSON. Expone una API tipo "colección".
 */
class Database {
  constructor(file) {
    this.file = file;
    this._ensureDir();
    this.data = this._load();
  }

  _ensureDir() {
    const dir = path.dirname(this.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _load() {
    if (!fs.existsSync(this.file)) {
      const seed = buildSeed();
      fs.writeFileSync(this.file, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const data = JSON.parse(fs.readFileSync(this.file, 'utf-8'));
    // Migración: si el esquema cambió, se regenera el seed (entorno de demo).
    if ((data.schemaVersion || 0) !== SEED_VERSION) {
      const seed = buildSeed();
      fs.writeFileSync(this.file, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    return data;
  }

  _persist() {
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  seed() {
    this.data = buildSeed();
    this._persist();
    return this.data;
  }

  collection(name) {
    if (!this.data[name]) this.data[name] = [];
    const ref = () => this.data[name];
    return {
      all: () => [...ref()],
      find: (predicate) => ref().filter(predicate),
      findOne: (predicate) => ref().find(predicate),
      findById: (id) => ref().find((doc) => doc.id === id),
      insert: (doc) => {
        ref().push(doc);
        this._persist();
        return doc;
      },
      update: (id, patch) => {
        const idx = ref().findIndex((doc) => doc.id === id);
        if (idx === -1) return null;
        ref()[idx] = { ...ref()[idx], ...patch };
        this._persist();
        return ref()[idx];
      },
      remove: (id) => {
        const idx = ref().findIndex((doc) => doc.id === id);
        if (idx === -1) return false;
        ref().splice(idx, 1);
        this._persist();
        return true;
      },
      count: () => ref().length,
    };
  }
}

export default new Database(DATA_FILE);
