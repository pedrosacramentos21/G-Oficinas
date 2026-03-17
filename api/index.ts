import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const MASTER_PASSWORD = 'Itf2026';
;

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// API health check
app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase.from('solicitacoes_andaime').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

  // API Routes for Andaimes
  app.get('/api/andaimes', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_andaime')
        .select('*')
        .order('data_montagem', { ascending: false })
        .order('hora_inicio', { ascending: true });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch andaimes' });
    }
  });

  app.post('/api/andaimes', async (req, res) => {
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
    
    const status = 'pendente';
    
    try {
      // Conflict detection
      const { data: conflicts, error: conflictError } = await supabase
        .from('solicitacoes_andaime')
        .select('*')
        .eq('data_montagem', data_montagem)
        .eq('status', 'aprovado')
        .or(`and(hora_inicio.lt.${hora_fim},hora_fim.gt.${hora_inicio})`);

      if (conflictError) throw conflictError;

      const { data, error } = await supabase
        .from('solicitacoes_andaime')
        .insert([{
          area, local_setor, tipo_servico, quantidade_pontos, 
          data_montagem, data_desmontagem, hora_inicio, hora_fim, 
          solicitante, descricao_local, status
        }])
        .select();

      if (error) throw error;

      if (conflicts && conflicts.length > 0) {
        res.json({ 
          id: data[0].id,
          message: `${conflicts[0].solicitante} já realizou um agendamento para este período, gentileza negociar priorização diretamente com ele(a) e sinalizar para Pedro Sacramento - ITF.` 
        });
      } else {
        res.json({ id: data[0].id });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to create andaime request' });
    }
  });

  app.patch('/api/andaimes/:id', async (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;

    try {
      const { data: request, error: fetchError } = await supabase
        .from('solicitacoes_andaime')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError || !request) return res.status(404).json({ error: 'Not found' });

      if (request.status === 'aprovado' && password !== MASTER_PASSWORD) {
        return res.status(401).json({ error: 'Senha mestre necessária para alterar solicitações aprovadas.' });
      }

      const { error } = await supabase
        .from('solicitacoes_andaime')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update andaime' });
    }
  });

  app.post('/api/andaimes/:id/aprovar', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }

    try {
      const { error } = await supabase
        .from('solicitacoes_andaime')
        .update({ status: 'aprovado' })
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve andaime' });
    }
  });

  app.post('/api/andaimes/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    try {
      const { data: request, error: fetchError } = await supabase
        .from('solicitacoes_andaime')
        .select('status')
        .eq('id', id)
        .single();

      if (request && request.status === 'aprovado' && password !== MASTER_PASSWORD) {
        return res.status(401).json({ error: 'Senha mestre necessária para excluir solicitações aprovadas.' });
      }

      const { error } = await supabase
        .from('solicitacoes_andaime')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete andaime' });
    }
  });

  app.post('/api/andaimes/batch-delete', async (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }
    try {
      const { error } = await supabase
        .from('solicitacoes_andaime')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete andaimes' });
    }
  });

  // API Routes for PTAs
  app.get('/api/ptas', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_pta')
        .select('*')
        .order('data', { ascending: false })
        .order('hora_inicio', { ascending: true });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ptas' });
    }
  });

  app.post('/api/ptas', async (req, res) => {
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
        // Conflict Detection
        const { data: conflicts, error: conflictError } = await supabase
          .from('solicitacoes_pta')
          .select('*')
          .eq('equipamento', equipamento)
          .eq('data', d)
          .eq('status', 'aprovado')
          .or(`and(hora_inicio.lt.${hora_fim},hora_fim.gt.${hora_inicio})`);

        if (conflictError) throw conflictError;

        const status = (conflicts && conflicts.length > 0) ? 'pendente' : 'aprovado';
        
        const { data: inserted, error } = await supabase
          .from('solicitacoes_pta')
          .insert([{ equipamento, area, responsavel, data: d, hora_inicio, hora_fim, descricao, prioridade, status }])
          .select();
        
        if (error) throw error;
        results.push({ id: inserted[0].id, data: d, status, conflict: conflicts && conflicts.length > 0 });
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

  app.post('/api/ptas/:id/aprovar', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }

    try {
      const { error } = await supabase
        .from('solicitacoes_pta')
        .update({ status: 'aprovado' })
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve pta' });
    }
  });

  app.patch('/api/ptas/:id', async (req, res) => {
    const { id } = req.params;
    const { updates, password } = req.body;

    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }

    try {
      const { error } = await supabase
        .from('solicitacoes_pta')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update pta' });
    }
  });

  app.post('/api/ptas/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    try {
      const { data: request, error: fetchError } = await supabase
        .from('solicitacoes_pta')
        .select('status')
        .eq('id', id)
        .single();

      if (request && request.status === 'aprovado' && password !== MASTER_PASSWORD) {
        return res.status(401).json({ error: 'Senha mestre necessária para excluir solicitações aprovadas.' });
      }

      const { error } = await supabase
        .from('solicitacoes_pta')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete pta' });
    }
  });

  app.post('/api/ptas/batch-delete', async (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }
    try {
      const { error } = await supabase
        .from('solicitacoes_pta')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete ptas' });
    }
  });

  // API Routes for Sala de Motores
  app.get('/api/sala-motores', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('atividades_sala_motores')
        .select('*')
        .order('data', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sala de motores' });
    }
  });

  app.post('/api/sala-motores', async (req, res) => {
    const { titulo, responsavel, data, custo_evitado, causa_raiz, observacoes } = req.body;
    try {
      const now = new Date().toISOString();
      const historico_status = [{ status: 'pendente', data: now }];
      const { data: inserted, error } = await supabase
        .from('atividades_sala_motores')
        .insert([{ 
          titulo, 
          responsavel, 
          data, 
          custo_evitado, 
          causa_raiz, 
          observacoes,
          status: 'pendente',
          historico_status
        }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error: any) {
      console.error('Error creating activity:', error);
      res.status(500).json({ error: error.message || 'Failed to create activity' });
    }
  });

  app.patch('/api/sala-motores/:id', async (req, res) => {
    const { id } = req.params;
    const { status, titulo, responsavel, data, custo_evitado, causa_raiz, observacoes, password } = req.body;
    
    try {
      // Fetch current activity to update history
      const { data: current, error: fetchError } = await supabase
        .from('atividades_sala_motores')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !current) return res.status(404).json({ error: 'Activity not found' });

      // If it's just a status update, no password needed
      const isStatusOnly = status && Object.keys(req.body).length === 1;

      if (!isStatusOnly && password !== MASTER_PASSWORD) {
        return res.status(401).json({ error: 'Senha mestre incorreta' });
      }

      const updateData: any = {};
      if (titulo) updateData.titulo = titulo;
      if (responsavel) updateData.responsavel = responsavel;
      if (data) updateData.data = data;
      if (custo_evitado !== undefined) updateData.custo_evitado = custo_evitado;
      if (causa_raiz !== undefined) updateData.causa_raiz = causa_raiz;
      if (observacoes !== undefined) updateData.observacoes = observacoes;

      if (status && status !== current.status) {
        updateData.status = status;
        const now = new Date().toISOString();
        const newHistory = [...(current.historico_status || []), { status, data: now }];
        updateData.historico_status = newHistory;

        if (status === 'em_andamento' && !current.data_inicio) {
          updateData.data_inicio = now;
        } else if (status === 'concluido' && !current.data_conclusao) {
          updateData.data_conclusao = now;
        } else if (status === 'entregue' && !current.data_entrega) {
          updateData.data_entrega = now;
        }
      }

      const { error } = await supabase
        .from('atividades_sala_motores')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating activity:', error);
      res.status(500).json({ error: error.message || 'Failed to update activity' });
    }
  });

  app.post('/api/sala-motores/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta' });
    }

    try {
      const { error } = await supabase
        .from('atividades_sala_motores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete activity' });
    }
  });

  app.post('/api/sala-motores/batch-delete', async (req, res) => {
    const { ids, password } = req.body;

    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta' });
    }

    try {
      const { error } = await supabase
        .from('atividades_sala_motores')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete activities' });
    }
  });

  // API Routes for Armstrong
  app.get('/api/armstrong/manutencoes', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('armstrong_manutencao')
        .select('*')
        .order('data', { ascending: true })
        .order('hora_inicio', { ascending: true });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch armstrong manutencoes' });
    }
  });

  app.post('/api/armstrong/manutencoes', async (req, res) => {
    const { titulo, area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('armstrong_manutencao')
        .insert([{ titulo, area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status: status || 'Planejada' }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create armstrong manutencao' });
    }
  });

  app.patch('/api/armstrong/manutencoes/:id', async (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_manutencao')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update armstrong manutencao' });
    }
  });

  app.post('/api/armstrong/manutencoes/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_manutencao')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete armstrong manutencao' });
    }
  });

  app.post('/api/armstrong/manutencoes/batch-delete', async (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_manutencao')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete armstrong manutencoes' });
    }
  });

  app.get('/api/armstrong/pcm-areas', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('armstrong_pcm_areas')
        .select('*');
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch armstrong pcm areas' });
    }
  });

  app.post('/api/armstrong/pcm-areas', async (req, res) => {
    const { data, area } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('armstrong_pcm_areas')
        .insert([{ data, area }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create armstrong pcm area' });
    }
  });

  app.delete('/api/armstrong/pcm-areas/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from('armstrong_pcm_areas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete armstrong pcm area' });
    }
  });

  app.get('/api/armstrong/backlog', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('armstrong_backlog')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch armstrong backlog' });
    }
  });

  app.post('/api/armstrong/backlog', async (req, res) => {
    const { area, titulo, impacto_energetico, investimento_estimado, data_prevista, status } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('armstrong_backlog')
        .insert([{ area, titulo, impacto_energetico, investimento_estimado, data_prevista, status: status || 'Não planejada' }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create armstrong backlog item' });
    }
  });

  app.patch('/api/armstrong/backlog/:id', async (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_backlog')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update armstrong backlog item' });
    }
  });

  app.post('/api/armstrong/backlog/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_backlog')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete armstrong backlog item' });
    }
  });

  app.post('/api/armstrong/backlog/batch-delete', async (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_backlog')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete armstrong backlog items' });
    }
  });

  // API Routes for Refrigeracao
  app.get('/api/refrigeracao/manutencoes', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('refrigeracao_manutencao')
        .select('*')
        .order('data', { ascending: true })
        .order('hora_inicio', { ascending: true });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch refrigeracao manutencoes' });
    }
  });

  app.post('/api/refrigeracao/manutencoes', async (req, res) => {
    const { titulo, area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('refrigeracao_manutencao')
        .insert([{ titulo, area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status: status || 'Planejada' }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create refrigeracao manutencao' });
    }
  });

  app.patch('/api/refrigeracao/manutencoes/:id', async (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('refrigeracao_manutencao')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update refrigeracao manutencao' });
    }
  });

  app.post('/api/refrigeracao/manutencoes/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('refrigeracao_manutencao')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete refrigeracao manutencao' });
    }
  });

  app.post('/api/refrigeracao/manutencoes/batch-delete', async (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('refrigeracao_manutencao')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete refrigeracao manutencoes' });
    }
  });

  app.get('/api/refrigeracao/pcm-areas', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('refrigeracao_pcm_areas')
        .select('*');
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch refrigeracao pcm areas' });
    }
  });

  app.post('/api/refrigeracao/pcm-areas', async (req, res) => {
    const { data, area } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('refrigeracao_pcm_areas')
        .insert([{ data, area }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create refrigeracao pcm area' });
    }
  });

  app.delete('/api/refrigeracao/pcm-areas/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from('refrigeracao_pcm_areas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete refrigeracao pcm area' });
    }
  });

  app.get('/api/refrigeracao/backlog', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('refrigeracao_backlog')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch refrigeracao backlog' });
    }
  });

  app.post('/api/refrigeracao/backlog', async (req, res) => {
    const { area, titulo, impacto_energetico, investimento_estimado, data_prevista, status } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('refrigeracao_backlog')
        .insert([{ area, titulo, impacto_energetico, investimento_estimado, data_prevista, status: status || 'Não planejada' }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create refrigeracao backlog item' });
    }
  });

  app.patch('/api/refrigeracao/backlog/:id', async (req, res) => {
    const { id } = req.params;
    const { password, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('refrigeracao_backlog')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update refrigeracao backlog item' });
    }
  });

  app.post('/api/refrigeracao/backlog/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('refrigeracao_backlog')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete refrigeracao backlog item' });
    }
  });

  app.post('/api/refrigeracao/backlog/batch-delete', async (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('refrigeracao_backlog')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch delete refrigeracao backlog items' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;
