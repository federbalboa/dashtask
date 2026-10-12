import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_FILE = path.join(__dirname, '..', 'data', 'db.json');
export const PORT = process.env.PORT || 4100;
export const DEMO_PASSWORD = 'demo123';
