import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

const db = new Database('andaimes.db');

// Initialize database with new tables
try {
  // Check if we need to migrate (simple check for new column)
  const tableInfo = db.prepare("PRAGMA table_info(solicitacoes_andaime)").all();
  const hasNewColumn = tableInfo.some((col: any) => col.name === 'data_montagem');
  
  if (tableInfo.length > 0 && !hasNewColumn) {
    console.log('Old schema detected, dropping tables for migration...');
    db.exec('DROP TABLE IF EXISTS solicitacoes_andaime');
  }
} catch (e) {
  console.error('Migration check failed:', e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS solicitacoes_andaime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area TEXT NOT NULL,
    local_setor TEXT NOT NULL,
    tipo_servico TEXT NOT NULL,
    quantidade_pontos INTEGER NOT NULL,
    data_montagem TEXT NOT NULL,
    data_desmontagem TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    solicitante TEXT NOT NULL,
    descricao_local TEXT,
    status TEXT DEFAULT 'pendente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS solicitacoes_pta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipamento TEXT NOT NULL,
    area TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    descricao TEXT,
    prioridade TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS atividades_sala_motores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    custo_evitado REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS oficina_servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servico TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const MASTER_PASSWORD = 'Itf2026';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // API Routes for Andaimes
  app.get('/api/andaimes', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM solicitacoes_andaime ORDER BY data_montagem DESC, hora_inicio ASC').all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch andaimes' });
    }
  });

  app.post('/api/andaimes', (req, res) => {
    const { 
      area, local_setor, tipo_servico, quantidade_pontos, 
      data_montagem, data_desmontagem, hora_inicio, hora_fim, 
      solicitante, descricao_local 
    } = req.body;

    if (!data_desmontagem) {
      return res.status(400).json({ error: 'A data de desmontagem prevista deve ser preenchida antes de enviar a solicitação.' });
    }

    if (new Date(data_desmontagem) < new Date(data_montagem)) {
      return res.status(400).json({ error: 'A data de desmontagem não pode ser anterior à data de montagem.' });
    }
    
    // Conflict Detection
    try {
      const conflict = db.prepare(`
        SELECT * FROM solicitacoes_andaime 
        WHERE data_montagem = ? AND status = 'aprovado' AND (
          (hora_inicio < ? AND hora_fim > ?) OR
          (hora_inicio < ? AND hora_fim > ?) OR
          (hora_inicio >= ? AND hora_fim <= ?)
        )
      `).get(data_montagem, hora_fim, hora_inicio, hora_inicio, hora_inicio, hora_inicio, hora_fim);

      if (conflict) {
        return res.status(409).json({ 
          error: `Conflito de horários, favor negociar priorização com ${(conflict as any).solicitante}.` 
        });
      }

      const info = db.prepare(`
        INSERT INTO solicitacoes_andaime (
          area, local_setor, tipo_servico, quantidade_pontos, 
          data_montagem, data_desmontagem, hora_inicio, hora_fim, 
          solicitante, descricao_local
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        area, local_setor, tipo_servico, quantidade_pontos, 
        data_montagem, data_desmontagem, hora_inicio, hora_fim, 
        solicitante, descricao_local
      );
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create andaime request' });
    }
  });

  app.patch('/api/andaimes/:id', (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;

    const request = db.prepare('SELECT status FROM solicitacoes_andaime WHERE id = ?').get(id) as any;
    if (!request) return res.status(404).json({ error: 'Not found' });

    if (request.status === 'aprovado' && password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre necessária para alterar solicitações aprovadas.' });
    }

    try {
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      
      db.prepare(`UPDATE solicitacoes_andaime SET ${setClause} WHERE id = ?`).run(...values, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update andaime' });
    }
  });

  app.post('/api/andaimes/:id/aprovar', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }

    try {
      db.prepare("UPDATE solicitacoes_andaime SET status = 'aprovado' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve andaime' });
    }
  });

  app.post('/api/andaimes/:id/delete', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    const request = db.prepare('SELECT status FROM solicitacoes_andaime WHERE id = ?').get(id) as any;
    if (request && request.status === 'aprovado' && password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre necessária para excluir solicitações aprovadas.' });
    }

    try {
      db.prepare('DELETE FROM solicitacoes_andaime WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete andaime' });
    }
  });

  // API Routes for PTAs
  app.get('/api/ptas', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM solicitacoes_pta ORDER BY data DESC, hora_inicio ASC').all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ptas' });
    }
  });

  app.post('/api/ptas', (req, res) => {
    const { equipamento, area, responsavel, data, hora_inicio, hora_fim, descricao, prioridade } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO solicitacoes_pta (equipamento, area, responsavel, data, hora_inicio, hora_fim, descricao, prioridade)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(equipamento, area, responsavel, data, hora_inicio, hora_fim, descricao, prioridade);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create pta request' });
    }
  });

  app.post('/api/ptas/:id/aprovar', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }

    try {
      db.prepare("UPDATE solicitacoes_pta SET status = 'aprovado' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve pta' });
    }
  });

  app.post('/api/ptas/:id/delete', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    const request = db.prepare('SELECT status FROM solicitacoes_pta WHERE id = ?').get(id) as any;
    if (request && request.status === 'aprovado' && password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre necessária para excluir solicitações aprovadas.' });
    }

    try {
      db.prepare('DELETE FROM solicitacoes_pta WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete pta' });
    }
  });

  // API Routes for Sala de Motores
  app.get('/api/sala-motores', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM atividades_sala_motores ORDER BY data DESC').all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sala de motores' });
    }
  });

  app.post('/api/sala-motores', (req, res) => {
    const { titulo, responsavel, data, custo_evitado } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO atividades_sala_motores (titulo, responsavel, data, custo_evitado)
        VALUES (?, ?, ?, ?)
      `).run(titulo, responsavel, data, custo_evitado);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create activity' });
    }
  });

  app.patch('/api/sala-motores/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare('UPDATE atividades_sala_motores SET status = ? WHERE id = ?').run(status, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update activity' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
