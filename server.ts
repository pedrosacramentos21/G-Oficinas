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

  CREATE TABLE IF NOT EXISTS armstrong_manutencao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT,
    area TEXT NOT NULL,
    equipamento TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    descricao TEXT,
    observacoes TEXT,
    impacto_energetico TEXT,
    investimento_estimado TEXT,
    status TEXT DEFAULT 'Planejada',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS armstrong_pcm_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    area TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS armstrong_backlog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area TEXT NOT NULL,
    titulo TEXT NOT NULL,
    impacto_energetico TEXT,
    investimento_estimado TEXT,
    data_prevista TEXT,
    status TEXT DEFAULT 'Não planejada',
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
    
    // All scaffolding requests must be pending by default
    const status = 'pendente';
    
    try {
      // Keep conflict detection for the message but status is always pending
      const conflict = db.prepare(`
        SELECT * FROM solicitacoes_andaime 
        WHERE data_montagem = ? AND status = 'aprovado' AND (
          (hora_inicio < ? AND hora_fim > ?) OR
          (hora_inicio < ? AND hora_fim > ?) OR
          (hora_inicio >= ? AND hora_fim <= ?)
        )
      `).get(data_montagem, hora_fim, hora_inicio, hora_inicio, hora_inicio, hora_inicio, hora_fim);

      const info = db.prepare(`
        INSERT INTO solicitacoes_andaime (
          area, local_setor, tipo_servico, quantidade_pontos, 
          data_montagem, data_desmontagem, hora_inicio, hora_fim, 
          solicitante, descricao_local, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        area, local_setor, tipo_servico, quantidade_pontos, 
        data_montagem, data_desmontagem, hora_inicio, hora_fim, 
        solicitante, descricao_local, status
      );

      if (conflict) {
        res.json({ 
          id: info.lastInsertRowid,
          message: `${(conflict as any).solicitante} já realizou um agendamento para este período, gentileza negociar priorização diretamente com ele(a) e sinalizar para Pedro Sacramento - ITF.` 
        });
      } else {
        res.json({ id: info.lastInsertRowid });
      }
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

  app.post('/api/andaimes/batch-delete', (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }
    try {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM solicitacoes_andaime WHERE id IN (${placeholders})`).run(...ids);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete andaimes' });
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
    const { equipamento, area, responsavel, data, data_fim, hora_inicio, hora_fim, descricao, prioridade, recorrente } = req.body;
    
    const dates = [];
    if (recorrente && data && data_fim) {
      let current = new Date(data);
      const end = new Date(data_fim);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else {
      dates.push(data);
    }

    try {
      const results = [];
      for (const d of dates) {
        // Conflict Detection: same equipment, same day, overlapping time, and already approved
        const conflict = db.prepare(`
          SELECT * FROM solicitacoes_pta 
          WHERE equipamento = ? AND data = ? AND status = 'aprovado' AND (
            (hora_inicio < ? AND hora_fim > ?) OR
            (hora_inicio < ? AND hora_fim > ?) OR
            (hora_inicio >= ? AND hora_fim <= ?)
          )
        `).get(equipamento, d, hora_fim, hora_inicio, hora_inicio, hora_inicio, hora_inicio, hora_fim);

        const status = conflict ? 'pendente' : 'aprovado';
        
        const info = db.prepare(`
          INSERT INTO solicitacoes_pta (equipamento, area, responsavel, data, hora_inicio, hora_fim, descricao, prioridade, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(equipamento, area, responsavel, d, hora_inicio, hora_fim, descricao, prioridade, status);
        
        results.push({ id: info.lastInsertRowid, data: d, status, conflict: !!conflict });
      }
      
      const hasConflict = results.some(r => r.conflict);
      if (hasConflict) {
        res.json({ 
          success: true, 
          results, 
          message: "Já existe um agendamento para este período. Gentileza negociar priorização com o solicitante responsável e alinhar com Pedro Sacramento - ITF." 
        });
      } else {
        res.json({ success: true, results });
      }
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

  app.post('/api/ptas/batch-delete', (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }
    try {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM solicitacoes_pta WHERE id IN (${placeholders})`).run(...ids);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete ptas' });
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

  // API Routes for Armstrong
  app.get('/api/armstrong/manutencoes', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM armstrong_manutencao ORDER BY data ASC, hora_inicio ASC').all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch armstrong manutencoes' });
    }
  });

  app.post('/api/armstrong/manutencoes', (req, res) => {
    const { titulo, area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO armstrong_manutencao (titulo, area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(titulo, area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status || 'Planejada');
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create armstrong manutencao' });
    }
  });

  app.patch('/api/armstrong/manutencoes/:id', (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE armstrong_manutencao SET ${setClause} WHERE id = ?`).run(...values, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update armstrong manutencao' });
    }
  });

  app.post('/api/armstrong/manutencoes/:id/delete', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      db.prepare('DELETE FROM armstrong_manutencao WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete armstrong manutencao' });
    }
  });

  app.post('/api/armstrong/manutencoes/batch-delete', (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM armstrong_manutencao WHERE id IN (${placeholders})`).run(...ids);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete armstrong manutencoes' });
    }
  });

  app.get('/api/armstrong/pcm-areas', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM armstrong_pcm_areas').all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch armstrong pcm areas' });
    }
  });

  app.post('/api/armstrong/pcm-areas', (req, res) => {
    const { data, area } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO armstrong_pcm_areas (data, area)
        VALUES (?, ?)
      `).run(data, area);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create armstrong pcm area' });
    }
  });

  app.delete('/api/armstrong/pcm-areas/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM armstrong_pcm_areas WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete armstrong pcm area' });
    }
  });

  app.get('/api/armstrong/backlog', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM armstrong_backlog ORDER BY created_at DESC').all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch armstrong backlog' });
    }
  });

  app.post('/api/armstrong/backlog', (req, res) => {
    const { area, titulo, impacto_energetico, investimento_estimado, data_prevista, status } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO armstrong_backlog (area, titulo, impacto_energetico, investimento_estimado, data_prevista, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(area, titulo, impacto_energetico, investimento_estimado, data_prevista, status || 'Não planejada');
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create armstrong backlog item' });
    }
  });

  app.patch('/api/armstrong/backlog/:id', (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE armstrong_backlog SET ${setClause} WHERE id = ?`).run(...values, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update armstrong backlog item' });
    }
  });

  app.post('/api/armstrong/backlog/:id/delete', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      db.prepare('DELETE FROM armstrong_backlog WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete armstrong backlog item' });
    }
  });

  app.post('/api/armstrong/backlog/batch-delete', (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM armstrong_backlog WHERE id IN (${placeholders})`).run(...ids);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete armstrong backlog items' });
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
