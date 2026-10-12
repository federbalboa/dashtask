import express from 'express';
import cors from 'cors';
import { PORT } from './config/paths.js';
import routes from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) =>
  res.json({ name: 'DashTask API', docs: '/api/admin/health', version: '1.0.0' })
);

app.use('/api', routes);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n  DashTask API escuchando en http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/admin/health\n`);
});
