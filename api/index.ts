import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let supabase: any;
try {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('Supabase client initialized successfully');
  } else {
    console.error('Supabase credentials missing at startup');
  }
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}

const MASTER_PASSWORD = 'Itf2026';

const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const parseUTCDate = (dateStr: string) => {
  const parts = dateStr.slice(0, 10).split('-');
  return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
};

const getWeekdayName = (dateStr: string) => {
  const date = parseUTCDate(dateStr);
  return WEEKDAY_NAMES[date.getUTCDay()];
};

const getWeekStartStr = (dateStr: string) => {
  const parts = dateStr.slice(0, 10).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(Date.UTC(y, m, d));
  const day = date.getUTCDay(); // 0 is Sunday, 1 is Monday, etc.
  const diffToSun = -day;
  const sunday = new Date(Date.UTC(y, m, d + diffToSun));
  return sunday.toISOString().split('T')[0];
};

const getWeekEndStr = (startStr: string) => {
  const parts = startStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(Date.UTC(y, m, d + 6));
  return date.toISOString().split('T')[0];
};

const getDetailedConflictMessage = (
  weekStartStr: string,
  targetArea: string,
  existingAndaimes: any[],
  newDates: string[]
) => {
  const areaLabel = (targetArea === 'Brassagem' || targetArea === 'Filtração/Adegas')
    ? 'Brassagem e Filtração/Adegas'
    : targetArea;

  const formatKey = (d: string) => d.split('T')[0];

  const existingByDate: { [date: string]: any[] } = {};
  existingAndaimes.forEach(a => {
    const k = formatKey(a.data_montagem);
    if (!existingByDate[k]) existingByDate[k] = [];
    existingByDate[k].push(a);
  });

  const uniqueDays = new Set<string>();
  existingAndaimes.forEach(a => uniqueDays.add(formatKey(a.data_montagem)));
  newDates.forEach(d => uniqueDays.add(formatKey(d)));

  const sortedDays = Array.from(uniqueDays).sort();

  const formatDayWithDetails = (dateStr: string) => {
    const k = formatKey(dateStr);
    const weekday = getWeekdayName(k);
    const dateFormatted = formatDateBR(k);
    
    if (existingByDate[k] && existingByDate[k].length > 0) {
      const details = existingByDate[k].map(a => `${a.tipo_servico === 'Desmontagem' ? 'Desmontagem' : 'Montagem'} (${a.area} - ${a.local_setor})`).join(', ');
      return `- ${weekday} (${dateFormatted}): já ocupado por ${details}`;
    } else {
      return `- ${weekday} (${dateFormatted}): sua nova solicitação`;
    }
  };

  if (uniqueDays.size > 3) {
    let msg = `Calendário travado: A área "${areaLabel}" não pode ter mais que 3 dias com agendamento na mesma semana (Domingo a Sábado) para evitar travar a semana toda para outros trabalhos.\n\n`;
    msg += `Nesta semana (${formatDateBR(weekStartStr)} a ${formatDateBR(getWeekEndStr(weekStartStr))}), identificamos:\n`;
    
    sortedDays.forEach(day => {
      msg += formatDayWithDetails(day) + '\n';
    });
    msg += `\nTotal: ${uniqueDays.size} dias diferentes com programação. Por favor, ajuste as datas.`;
    return msg;
  }

  let consecutiveDaysSeq: string[] = [];
  let consecutive = 1;
  let hasLimitViolation = false;
  let tempSeq = [sortedDays[0]];

  for (let i = 1; i < sortedDays.length; i++) {
    const d1 = parseUTCDate(sortedDays[i-1]);
    const d2 = parseUTCDate(sortedDays[i]);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      consecutive++;
      tempSeq.push(sortedDays[i]);
      if (consecutive > 2) {
        hasLimitViolation = true;
        consecutiveDaysSeq = [...tempSeq];
      }
    } else {
      consecutive = 1;
      tempSeq = [sortedDays[i]];
    }
  }

  if (hasLimitViolation) {
    let msg = `Calendário travado: A área "${areaLabel}" não pode ter mais que 2 dias consecutivos de andaime na mesma semana para garantir a rotatividade de outras frentes.\n\n`;
    msg += `Foi detectada uma sequência de ${consecutiveDaysSeq.length} dias seguidos com agendamento:\n`;
    consecutiveDaysSeq.forEach(day => {
      msg += formatDayWithDetails(day) + '\n';
    });
    msg += `\nPor favor, deixe pelo menos um dia de intervalo para quebrar a sequência de consecutivos.`;
    return msg;
  }

  return null;
};

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
          const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
          return { table, count: count || 0, error };
        })
      );

      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error('Database connection errors:', errors);
        const errorDetails = errors.map(e => `${e.table}: ${e.error?.message}`).join(', ');
        return res.status(500).json({ 
          status: 'error', 
          message: `Erro em algumas tabelas: ${errorDetails}`,
          missing_tables: errors.map(e => e.table),
          counts: results.reduce((acc: any, curr) => { acc[curr.table] = curr.count; return acc; }, {})
        });
      }

      res.json({ 
        status: 'ok', 
        counts: results.reduce((acc: any, curr) => { acc[curr.table] = curr.count; return acc; }, {})
      });
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

    if (diffDays > 30 && !somente_backlog) {
      return res.status(400).json({ error: 'A data de desmontagem deve ser no máximo 30 dias após a data de montagem.' });
    }
    
    const status = 'pendente';
    
    try {
      if (!somente_backlog) {
        // 0. Global Daily Limit (Max 2 per day)
        const { count: dailyCount, error: dailyError } = await supabase
          .from('solicitacoes_andaime')
          .select('*', { count: 'exact', head: true })
          .eq('data_montagem', data_montagem);
        
        if (dailyError) throw dailyError;
        if ((dailyCount || 0) >= 2) {
          return res.status(400).json({ error: `Limite global atingido: Já existem ${dailyCount} solicitações para o dia ${new Date(data_montagem).toLocaleDateString('pt-BR')}. Não é permitido mais que 2 solicitações por dia no total.` });
        }

        // Check for disassembly date global limit as well
        if (tipo_servico === 'Montagem' && data_desmontagem) {
          const { count: disCount, error: disError } = await supabase
            .from('solicitacoes_andaime')
            .select('*', { count: 'exact', head: true })
            .eq('data_montagem', data_desmontagem);
          
          if (disError) throw disError;
          if ((disCount || 0) >= 2) {
            return res.status(400).json({ error: `Limite global atingido na data de desmontagem: Já existem ${disCount} solicitações para o dia ${new Date(data_desmontagem).toLocaleDateString('pt-BR')}. Por favor, escolha outra data para desmontagem.` });
          }
        }

        // Scheduling restrictions
        // 1. Max 3 total days per area per week (Assembly OR Dismantling)
        // 2. Max 2 consecutive days per area per week
        
        const checkAreaWeekConflicts = async (targetDates: string[], targetArea: string, excludeId?: number) => {
          // Group target dates by their week (Monday to Sunday)
          const weekGroups: { [weekStart: string]: string[] } = {};
          
          targetDates.forEach(date => {
            const weekStart = getWeekStartStr(date);
            if (!weekGroups[weekStart]) weekGroups[weekStart] = [];
            weekGroups[weekStart].push(date.split('T')[0]);
          });

          for (const weekStartStr of Object.keys(weekGroups)) {
            const weekEndStr = getWeekEndStr(weekStartStr);

            let query = supabase
              .from('solicitacoes_andaime')
              .select('id, area, local_setor, tipo_servico, data_montagem');

            if (targetArea === 'Brassagem' || targetArea === 'Filtração/Adegas') {
              query = query.in('area', ['Brassagem', 'Filtração/Adegas']);
            } else {
              query = query.eq('area', targetArea);
            }

            query = query
              .gte('data_montagem', weekStartStr)
              .lte('data_montagem', weekEndStr)
              .not('status', 'eq', 'reprovado');
            
            if (excludeId) {
              query = query.not('id', 'eq', excludeId);
            }

            const { data: weekAndaimes, error: weekError } = await query;
            if (weekError) throw weekError;

            const explanation = getDetailedConflictMessage(weekStartStr, targetArea, weekAndaimes || [], weekGroups[weekStartStr]);
            if (explanation) {
              return explanation;
            }
          }
          return null;
        };

        const datesToCheck = [data_montagem];
        if (tipo_servico === 'Montagem' && data_desmontagem) {
          datesToCheck.push(data_desmontagem);
        }

        const weekError = await checkAreaWeekConflicts(datesToCheck, area);
        if (weekError) {
          return res.status(400).json({ error: weekError });
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
          status_execucao: 'Pendente'
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
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !request) return res.status(404).json({ error: 'Not found' });

      if (request.status === 'aprovado' && password !== MASTER_PASSWORD) {
        return res.status(401).json({ error: 'Senha mestre necessária para alterar solicitações aprovadas.' });
      }

      // Check for date/area conflicts if they are being updated
      const targetDate = updates.data_montagem || request.data_montagem;
      const targetArea = updates.area || request.area;
      const targetDesmontagem = updates.data_desmontagem || request.data_desmontagem;

      const isSomenteBacklog = updates.somente_backlog !== undefined ? updates.somente_backlog : request.somente_backlog;

      const dateMontagemChanged = updates.data_montagem && updates.data_montagem !== request.data_montagem;
      const dateDesmontagemChanged = updates.data_desmontagem && updates.data_desmontagem !== request.data_desmontagem;
      const areaChanged = updates.area && updates.area !== request.area;

      let isSameWeekMove = false;
      if (updates.data_montagem && request.data_montagem) {
        const oldWeek = getWeekStartStr(request.data_montagem);
        const newWeek = getWeekStartStr(updates.data_montagem);
        if (oldWeek === newWeek) {
          isSameWeekMove = true;
        }
      } else if (updates.data_desmontagem && request.data_desmontagem) {
        const oldWeek = getWeekStartStr(request.data_desmontagem);
        const newWeek = getWeekStartStr(updates.data_desmontagem);
        if (oldWeek === newWeek) {
          isSameWeekMove = true;
        }
      }

      if ((dateMontagemChanged || areaChanged || dateDesmontagemChanged) && !isSomenteBacklog && !isSameWeekMove) {
        // 1. Global Daily Limit (Max 2)
        const checkGlobalLimit = async (date: any, currentId: any) => {
          const { count, error } = await supabase
            .from('solicitacoes_andaime')
            .select('*', { count: 'exact', head: true })
            .eq('data_montagem', date)
            .not('id', 'eq', currentId);
          if (error) throw error;
          return count || 0;
        };

        if (dateMontagemChanged) {
          const dailyCount = await checkGlobalLimit(updates.data_montagem, id as any);
          if (dailyCount >= 2) {
            return res.status(400).json({ error: `Limite global atingido: Já existem ${dailyCount} solicitações para o dia ${formatDateBR(updates.data_montagem)}.` });
          }
        }

        if (dateDesmontagemChanged && updates.data_desmontagem !== targetDate) {
          const disCount = await checkGlobalLimit(updates.data_desmontagem, id as any);
          if (disCount >= 2) {
            return res.status(400).json({ error: `Limite global atingido na data de desmontagem: Já existem ${disCount} solicitações para o dia ${formatDateBR(updates.data_desmontagem)}.` });
          }
        }

        // 2. Area Week Limits
        const datesToCheck = [];
        if (updates.data_montagem) {
          datesToCheck.push(updates.data_montagem);
        } else if (areaChanged) {
          datesToCheck.push(request.data_montagem);
        }

        if (updates.data_desmontagem && updates.data_desmontagem !== targetDate) {
          datesToCheck.push(updates.data_desmontagem);
        } else if (areaChanged && request.data_desmontagem && request.data_desmontagem !== targetDate) {
          datesToCheck.push(request.data_desmontagem);
        }

        const weekGroups: { [weekStart: string]: string[] } = {};
        datesToCheck.forEach(date => {
          if (!date) return;
          const weekStart = getWeekStartStr(date);
          if (!weekGroups[weekStart]) weekGroups[weekStart] = [];
          weekGroups[weekStart].push(date.split('T')[0]);
        });

        for (const weekStartStr of Object.keys(weekGroups)) {
          const weekEndStr = getWeekEndStr(weekStartStr);

          let query = supabase
            .from('solicitacoes_andaime')
            .select('id, area, local_setor, tipo_servico, data_montagem');

          if (targetArea === 'Brassagem' || targetArea === 'Filtração/Adegas') {
            query = query.in('area', ['Brassagem', 'Filtração/Adegas']);
          } else {
            query = query.eq('area', targetArea);
          }

          query = query
            .gte('data_montagem', weekStartStr)
            .lte('data_montagem', weekEndStr)
            .not('status', 'eq', 'reprovado')
            .not('id', 'eq', id);

          const { data: weekAndaimes, error: weekError } = await query;

          if (weekError) throw weekError;

          const explanation = getDetailedConflictMessage(weekStartStr, targetArea, weekAndaimes || [], weekGroups[weekStartStr]);
          if (explanation) {
            return res.status(400).json({ error: explanation });
          }
        }
      }

      const { error } = await supabase
        .from('solicitacoes_andaime')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;

      // Cascade update to associated Desmontagem record if this is a Montagem
      if (request.tipo_servico === 'Montagem') {
        const disUpdates: any = {};
        if (updates.data_desmontagem) {
          disUpdates.data_montagem = updates.data_desmontagem;
          disUpdates.data_desmontagem = updates.data_desmontagem;
        }
        if (updates.area) disUpdates.area = updates.area;
        if (updates.local_setor) disUpdates.local_setor = `${updates.local_setor} (DESMONTAGEM)`;
        if (updates.data_montagem) disUpdates.data_montagem_original = updates.data_montagem;

        if (Object.keys(disUpdates).length > 0) {
          await supabase
            .from('solicitacoes_andaime')
            .update(disUpdates)
            .eq('tipo_servico', 'Desmontagem')
            .eq('data_montagem_original', request.data_montagem)
            .ilike('local_setor', `%${request.local_setor}%`);
        }
      }

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

  app.get('/api/workshop/checklists', async (req, res) => {
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('workshop_checklists')
        .select('*')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch workshop checklists' });
    }
  });

  app.post('/api/workshop/checklists', async (req, res) => {
    const { data, responsavel, equipamento, items, observacoes } = req.body;
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const values = Object.values(items);
      const condicao = values.includes('N') ? 'N' : 'S';
      const { data: inserted, error } = await supabase
        .from('workshop_checklists')
        .insert([{ data, responsavel, equipamento, items, observacoes, condicao }])
        .select();
      if (error) throw error;
      res.json({ id: inserted[0].id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create workshop checklist' });
    }
  });

  app.delete('/api/workshop/checklists/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase
        .from('workshop_checklists')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete workshop checklist' });
    }
  });

  app.get('/api/workshop/equipment', async (req, res) => {
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('workshop_equipment')
        .select('*')
        .order('name');
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch workshop equipment' });
    }
  });

  app.post('/api/workshop/equipment', async (req, res) => {
    const { name, local, items } = req.body;
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data: inserted, error } = await supabase
        .from('workshop_equipment')
        .insert([{ name, local, items }])
        .select();
      if (error) throw error;
      res.json(inserted[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create workshop equipment' });
    }
  });

  app.put('/api/workshop/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { name, local, items } = req.body;
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data: updated, error } = await supabase
        .from('workshop_equipment')
        .update({ name, local, items })
        .eq('id', id)
        .select();
      if (error) throw error;
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update workshop equipment' });
    }
  });

  app.delete('/api/workshop/equipment/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (!supabase) throw new Error('Supabase not initialized');
      const { error } = await supabase
        .from('workshop_equipment')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete workshop equipment' });
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
    const PORT = 3000;
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
