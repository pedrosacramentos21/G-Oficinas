import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let supabase: any;
try {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.error('Supabase credentials missing at startup');
  }
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}

const MASTER_PASSWORD = 'Itf2026';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Basic ping to check if server is running at all
  app.get('/api/ping', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      server: 'ready',
      env: process.env.NODE_ENV
    });
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ status: 'error', message: 'Supabase client not initialized. Check environment variables.' });
      }

      const tables = [
        'solicitacoes_andaime',
        'solicitacoes_pta',
        'atividades_sala_motores',
        'armstrong_manutencao',
        'armstrong_backlog',
        'refrigeracao_manutencao',
        'refrigeracao_backlog',
        'oficina_servicos',
        'armstrong_pcm_areas',
        'refrigeracao_pcm_areas'
      ];

      const results = await Promise.all(
        tables.map(async (table) => {
          const { error } = await supabase.from(table).select('id').limit(1);
          return { table, error };
        })
      );

      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error('Database connection errors:', errors);
        const errorDetails = errors.map(e => `${e.table}: ${e.error?.message}`).join(', ');
        return res.status(500).json({ 
          status: 'error', 
          message: `Erro em algumas tabelas: ${errorDetails}`,
          missing_tables: errors.map(e => e.table)
        });
      }

      res.json({ status: 'ok' });
    } catch (error: any) {
      console.error('Health check exception:', error);
      res.status(500).json({ status: 'error', message: error.message || 'Database connection failed' });
    }
  });

  // API Routes for Andaimes
  app.get('/api/andaimes', async (req, res) => {
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('solicitacoes_andaime')
        .select('*')
        .order('data_montagem', { ascending: false })
        .order('hora_inicio', { ascending: true });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch andaimes' });
    }
  });

  app.post('/api/andaimes', async (req, res) => {
    const { 
      area, local_setor, tipo_servico, quantidade_pontos, 
      data_montagem, data_desmontagem, hora_inicio, hora_fim, 
      solicitante, descricao_local, excedeu_limite, justificativa_excesso,
      somente_backlog
    } = req.body;

    if (!data_desmontagem) {
      return res.status(400).json({ error: 'A data de desmontagem prevista deve ser preenchida antes de enviar a solicitação.' });
    }

    if (new Date(data_desmontagem) < new Date(data_montagem)) {
      return res.status(400).json({ error: 'A data de desmontagem não pode ser anterior à data de montagem.' });
    }

    const dateMontagem = new Date(data_montagem);
    const dateDesmontagem = new Date(data_desmontagem);
    const diffTime = Math.abs(dateDesmontagem.getTime() - dateMontagem.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      return res.status(400).json({ error: 'A data de desmontagem deve ser no máximo 30 dias após a data de montagem.' });
    }
    
    const status = 'pendente';
    
    try {
      // Scheduling restrictions
      // 1. Max 3 total bookings per area per week
      // 2. Max 2 consecutive days per area per week
      
      const mon = new Date(dateMontagem);
      const day = mon.getDay();
      const diffToMon = mon.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(mon.setDate(diffToMon)).toISOString().split('T')[0];
      const weekEnd = new Date(mon.setDate(mon.getDate() + 6)).toISOString().split('T')[0];

      const { data: weekAndaimes, error: weekError } = await supabase
        .from('solicitacoes_andaime')
        .select('data_montagem')
        .eq('area', area)
        .eq('tipo_servico', 'Montagem')
        .gte('data_montagem', weekStart)
        .lte('data_montagem', weekEnd)
        .not('status', 'eq', 'reprovado');

      if (weekError) throw weekError;

      if (weekAndaimes) {
        // Count unique days in the week
        const uniqueDays = new Set(weekAndaimes.map(a => a.data_montagem.split('T')[0]));
        uniqueDays.add(data_montagem.split('T')[0]);

        if (uniqueDays.size > 3) {
          return res.status(400).json({ error: 'Não é permitido realizar mais de 3 agendamentos na mesma semana para uma mesma área a fim de garantir a rotatividade no atendimento.' });
        }

        // Check for 3 consecutive days
        const sortedDays = Array.from(uniqueDays).sort() as string[];
        let consecutive = 1;
        for (let i = 1; i < sortedDays.length; i++) {
          const d1 = new Date(sortedDays[i-1]);
          const d2 = new Date(sortedDays[i]);
          const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            consecutive++;
            if (consecutive > 2) {
              return res.status(400).json({ error: 'Não é permitido agendar por mais de 2 dias consecutivos na mesma semana para uma mesma área.' });
            }
          } else {
            consecutive = 1;
          }
        }
      }

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
          solicitante, descricao_local, status: somente_backlog ? 'aprovado' : status,
          excedeu_limite, justificativa_excesso, somente_backlog,
          status_execucao: 'Montagem Pendente'
        }])
        .select();

      if (error) throw error;

      // Automatic disassembly record
      if (tipo_servico === 'Montagem' && data_desmontagem) {
        await supabase
          .from('solicitacoes_andaime')
          .insert([{
            area, 
            local_setor: `${local_setor} (DESMONTAGEM)`, 
            tipo_servico: 'Desmontagem', 
            quantidade_pontos: 0, 
            data_montagem: data_desmontagem, 
            data_desmontagem: data_desmontagem, 
            data_montagem_original: data_montagem, // Use original montagem date
            hora_inicio: '08:00', 
            hora_fim: '17:00', 
            solicitante, 
            descricao_local: `Desmontagem automática referente à solicitação #${data[0].id}`, 
            status: 'pendente'
          }]);
      }

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

  app.post('/api/andaimes/batch-approve', async (req, res) => {
    const { ids, password } = req.body;
    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }
    try {
      const { error } = await supabase
        .from('solicitacoes_andaime')
        .update({ status: 'aprovado' })
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch approve andaimes' });
    }
  });

  app.post('/api/andaimes/batch-update', async (req, res) => {
    const { ids, updates, password } = req.body;
    if (password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }
    try {
      const { error } = await supabase
        .from('solicitacoes_andaime')
        .update(updates)
        .in('id', ids);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch update andaimes' });
    }
  });

  // API Routes for PTAs
  app.patch('/api/andaimes/:id/status-execucao', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const { data: updated, error } = await supabase
        .from('solicitacoes_andaime')
        .update({ status_execucao: status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Se for Desmontagem e marcar como Concluído, remover a montagem original do backlog
      if (status === 'Concluído' && updated.tipo_servico === 'Desmontagem') {
        const match = updated.descricao_local?.match(/#(\d+)/);
        if (match) {
          const originalId = parseInt(match[1]);
          await supabase
            .from('solicitacoes_andaime')
            .update({ esconder_no_backlog: true })
            .eq('id', originalId);
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update status_execucao' });
    }
  });

  app.get('/api/ptas', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_pta')
        .select('*')
        .order('data', { ascending: false })
        .order('hora_inicio', { ascending: true });
      
      if (error) {
        console.error('Supabase error fetching PTAs:', error);
        throw error;
      }
      res.json(data || []);
    } catch (error: any) {
      console.error('Failed to fetch ptas:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch ptas' });
    }
  });

  app.post('/api/ptas', async (req, res) => {
    try {
      const { equipamento, area, responsavel, data, data_fim, hora_inicio, hora_fim, descricao, prioridade, recorrente } = req.body;
      
      if (!equipamento || !area || !responsavel || !data || !hora_inicio || !hora_fim) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      }

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

      const results = [];
      for (const d of dates) {
        // Conflict Detection - check if there's an approved request for the same equipment and time
        const { data: conflicts, error: conflictError } = await supabase
          .from('solicitacoes_pta')
          .select('*')
          .eq('equipamento', equipamento)
          .eq('data', d)
          .eq('status', 'aprovado')
          .or(`and(hora_inicio.lt.${hora_fim},hora_fim.gt.${hora_inicio})`);

        if (conflictError) {
          console.error('Conflict detection error:', conflictError);
          throw conflictError;
        }

        const status = (conflicts && conflicts.length > 0) ? 'pendente' : 'aprovado';
        
        const { data: inserted, error } = await supabase
          .from('solicitacoes_pta')
          .insert([{ 
            equipamento, 
            area, 
            responsavel, 
            data: d, 
            hora_inicio, 
            hora_fim, 
            descricao: descricao || '', 
            prioridade: prioridade || 'Normal', 
            status 
          }])
          .select();
        
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        if (!inserted || inserted.length === 0) {
          throw new Error('Falha ao inserir registro (verifique as permissões RLS no Supabase)');
        }

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
    } catch (error: any) {
      console.error('Failed to create pta request:', error);
      res.status(500).json({ error: error.message || 'Failed to create pta request' });
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
    const { titulo, responsavel, data, custo_evitado, causa_raiz, observacoes, area, sub_area, tag_motor } = req.body;
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
          area,
          sub_area,
          tag_motor,
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
    const { status, titulo, responsavel, data, custo_evitado, causa_raiz, observacoes, area, sub_area, tag_motor, password } = req.body;
    
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
      if (area !== undefined) updateData.area = area;
      if (sub_area !== undefined) updateData.sub_area = sub_area;
      if (tag_motor !== undefined) updateData.tag_motor = tag_motor;

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
    const { titulo, area, sub_area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, impacto_energetico, investimento_estimado, status, tipo_manutencao } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('armstrong_manutencao')
        .insert([{ 
          titulo, 
          area, 
          sub_area: sub_area || '', 
          equipamento, 
          responsavel, 
          data, 
          hora_inicio, 
          hora_fim, 
          descricao, 
          observacoes: observacoes || '', 
          impacto_energetico, 
          investimento_estimado, 
          status: status || 'Planejada',
          tipo_manutencao
        }])
        .select();
      
      if (error) throw error;
      if (!inserted || inserted.length === 0) throw new Error('Nenhum dado retornado após a inserção.');
      res.json({ id: inserted[0].id });
    } catch (error: any) {
      console.error('Erro ao criar manutenção Armstrong:', error);
      res.status(500).json({ error: error.message || 'Failed to create armstrong manutencao' });
    }
  });

  app.patch('/api/armstrong/manutencoes/:id', async (req, res) => {
    const { id } = req.params;
    const { password, id: _id, created_at: _ca, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_manutencao')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao atualizar manutenção Armstrong:', error);
      res.status(500).json({ error: error.message || 'Failed to update armstrong manutencao' });
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
    const { area, sub_area, titulo, impacto_energetico, investimento_estimado, data_prevista, status, observacoes, descricao, equipamento, responsavel, hora_inicio, hora_fim, tipo_manutencao } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('armstrong_backlog')
        .insert([{ 
          area, 
          sub_area, 
          titulo, 
          impacto_energetico, 
          investimento_estimado, 
          data_prevista, 
          status: status || 'Não planejada', 
          observacoes, 
          descricao,
          equipamento,
          responsavel,
          hora_inicio,
          hora_fim,
          tipo_manutencao
        }])
        .select();
      
      if (error) throw error;
      if (!inserted || inserted.length === 0) throw new Error('Nenhum dado retornado após a inserção.');
      res.json({ id: inserted[0].id });
    } catch (error: any) {
      console.error('Erro ao criar backlog Armstrong:', error);
      res.status(500).json({ error: error.message || 'Failed to create armstrong backlog item' });
    }
  });

  app.patch('/api/armstrong/backlog/:id', async (req, res) => {
    const { id } = req.params;
    const { password, id: _id, created_at: _ca, ...updates } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta.' });
    try {
      const { error } = await supabase
        .from('armstrong_backlog')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao atualizar backlog Armstrong:', error);
      res.status(500).json({ error: error.message || 'Failed to update armstrong backlog item' });
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
  app.post('/api/armstrong/backlog/batch-update', async (req, res) => {
    const { ids, updates, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta' });
    try {
      const { error } = await supabase.from('armstrong_backlog').update(updates).in('id', ids);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch update armstrong backlog' });
    }
  });

  app.post('/api/refrigeracao/backlog/batch-update', async (req, res) => {
    const { ids, updates, password } = req.body;
    if (password !== MASTER_PASSWORD) return res.status(401).json({ error: 'Senha mestre incorreta' });
    try {
      const { error } = await supabase.from('refrigeracao_backlog').update(updates).in('id', ids);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to batch update refrigeracao backlog' });
    }
  });

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
    const { titulo, area, sub_area, equipamento, responsavel, data, hora_inicio, hora_fim, descricao, observacoes, investimento_estimado, status, tipo_manutencao, nivel_criticidade } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('refrigeracao_manutencao')
        .insert([{ 
          titulo, 
          area, 
          sub_area: sub_area || '', 
          equipamento, 
          responsavel, 
          data, 
          hora_inicio, 
          hora_fim, 
          descricao, 
          observacoes: observacoes || '', 
          investimento_estimado: investimento_estimado || '',
          status: status || 'Planejada',
          tipo_manutencao,
          nivel_criticidade
        }])
        .select();
      
      if (error) throw error;
      if (!inserted || inserted.length === 0) throw new Error('Nenhum dado retornado após a inserção.');
      res.json({ id: inserted[0].id });
    } catch (error: any) {
      console.error('Erro ao criar manutenção Refrigeração:', error);
      res.status(500).json({ error: error.message || 'Failed to create refrigeracao manutencao' });
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

  app.get('/api/oficina/servicos', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('oficina_servicos')
        .select('*')
        .order('data', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch oficina servicos' });
    }
  });

  app.post('/api/oficina/servicos', async (req, res) => {
    const { servico, responsavel, data, status } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('oficina_servicos')
        .insert([{ servico, responsavel, data, status: status || 'pendente' }])
        .select();
      
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create oficina servico' });
    }
  });

  app.post('/api/refrigeracao/backlog', async (req, res) => {
    const { area, sub_area, titulo, investimento_estimado, data_prevista, status, observacoes, descricao, equipamento, responsavel, hora_inicio, hora_fim, tipo_manutencao, nivel_criticidade } = req.body;
    try {
      const { data: inserted, error } = await supabase
        .from('refrigeracao_backlog')
        .insert([{ 
          area, 
          sub_area, 
          titulo, 
          investimento_estimado: investimento_estimado || '',
          data_prevista, 
          status: status || 'Não planejada', 
          observacoes, 
          descricao,
          equipamento,
          responsavel,
          hora_inicio,
          hora_fim,
          tipo_manutencao,
          nivel_criticidade
        }])
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
    // In production (Vercel), we serve static files from /dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

const appPromise = startServer();

// For local development (tsx api/index.ts)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  appPromise.then(app => {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server version: 1.0.2`);
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    });
  }).catch(err => {
    console.error('FATAL: Failed to start server:', err);
    process.exit(1);
  });
}

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
