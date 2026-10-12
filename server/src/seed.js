import db from './models/Database.js';

// Ejecuta el seed manualmente: `npm run seed`
db.seed();
console.log('✔ Base de datos local regenerada en server/src/data/db.json');
