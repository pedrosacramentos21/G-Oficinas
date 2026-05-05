import { useStore } from '../store';

/**
 * Helper to recover data from LocalStorage if it existed before the migration to Supabase.
 * Most common keys used in previous versions.
 */
export async function syncLocalStorageToSupabase() {
  const store = (await import('../store')).useStore.getState();
  
  const recoveryMap: { key: string, action: (data: any) => Promise<any>, type: string }[] = [
    { key: 'andaimes_data', action: store.addAndaime, type: 'andaime' },
    { key: 'ptas_data', action: store.addPTA, type: 'pta' },
    { key: 'ptas_activities', action: store.addPTA, type: 'pta' },
    { key: 'sala_motores_activities', action: store.addAtividadeSalaMotores, type: 'sala_motores' },
    { key: 'sala_motores_data', action: store.addAtividadeSalaMotores, type: 'sala_motores' },
    { key: 'atividades_sala_motores', action: store.addAtividadeSalaMotores, type: 'sala_motores' },
    { key: 'armstrong_manutencoes', action: store.addArmstrongManutencao, type: 'armstrong_manutencao' },
    { key: 'armstrong_data', action: store.addArmstrongManutencao, type: 'armstrong_manutencao' },
    { key: 'armstrong_backlog', action: store.addArmstrongBacklog, type: 'armstrong_backlog' },
    { key: 'refrigeracao_manutencoes', action: store.addRefrigeracaoManutencao, type: 'refrigeracao_manutencao' },
    { key: 'refrigeracao_data', action: store.addRefrigeracaoManutencao, type: 'refrigeracao_manutencao' },
    { key: 'refrigeracao_backlog', action: store.addRefrigeracaoBacklog, type: 'refrigeracao_backlog' },
    { key: 'oficina_servicos', action: store.addOficinaServico, type: 'oficina' },
  ];

  let totalRecovered = 0;

  // Simple field mapping to handle camelCase -> snake_case transitions if they exist
  const mapItem = (item: any, type: string) => {
    const mapped = { ...item };
    
    // Common mappings
    if (item.horaInicio && !item.hora_inicio) mapped.hora_inicio = item.horaInicio;
    if (item.horaFim && !item.hora_fim) mapped.hora_fim = item.horaFim;
    if (item.dataFim && !item.data_fim) mapped.data_fim = item.dataFim;
    if (item.dataMontagem && !item.data_montagem) mapped.data_montagem = item.dataMontagem;
    if (item.dataDesmontagem && !item.data_desmontagem) mapped.data_desmontagem = item.dataDesmontagem;

    if (type === 'sala_motores') {
      if (item.custoEvitado && !item.custo_evitado) mapped.custo_evitado = item.custoEvitado;
      if (item.causaRaiz && !item.causa_raiz) mapped.causa_raiz = item.causaRaiz;
      if (item.subArea && !item.sub_area) mapped.sub_area = item.subArea;
      if (item.tagMotor && !item.tag_motor) mapped.tag_motor = item.tagMotor;
    }

    if (type === 'armstrong_manutencao' || type === 'armstrong_backlog' || type === 'refrigeracao_manutencao' || type === 'refrigeracao_backlog') {
      if (item.subArea && !item.sub_area) mapped.sub_area = item.subArea;
      if (item.impactoEnergetico && !item.impacto_energetico) mapped.impacto_energetico = item.impactoEnergetico;
      if (item.investimentoEstimado && !item.investimento_estimado) mapped.investimento_estimado = item.investimentoEstimado;
      if (item.dataPrevista && !item.data_prevista) mapped.data_prevista = item.dataPrevista;
      if (item.tipoManutencao && !item.tipo_manutencao) mapped.tipo_manutencao = item.tipoManutencao;
      if (item.nivelCriticidade && !item.nivel_criticidade) mapped.nivel_criticidade = item.nivelCriticidade;
    }

    return mapped;
  };

  // Known keys already in the map
  const knownKeys = recoveryMap.map(m => m.key);
  
  // Find other potential keys by prefix
  const allLocalStorageKeys = Object.keys(localStorage);
  const prefixes = ['andaimes', 'ptas', 'sala_motores', 'armstrong', 'refrigeracao', 'oficina', 'atividades'];
  
  for (const key of allLocalStorageKeys) {
    if (prefixes.some(p => key.startsWith(p)) && !knownKeys.includes(key)) {
      // Try to guess the type by prefix
      let type = 'andaime';
      let action = store.addAndaime;
      
      if (key.startsWith('ptas')) { type = 'pta'; action = store.addPTA; }
      else if (key.includes('motores') || key.startsWith('atividades')) { type = 'sala_motores'; action = store.addAtividadeSalaMotores; }
      else if (key.startsWith('armstrong')) { 
        if (key.includes('backlog')) { type = 'armstrong_backlog'; action = store.addArmstrongBacklog; }
        else { type = 'armstrong_manutencao'; action = store.addArmstrongManutencao; }
      }
      else if (key.startsWith('refrigeracao')) {
        if (key.includes('backlog')) { type = 'refrigeracao_backlog'; action = store.addRefrigeracaoBacklog; }
        else { type = 'refrigeracao_manutencao'; action = store.addRefrigeracaoManutencao; }
      }
      else if (key.startsWith('oficina')) { type = 'oficina'; action = store.addOficinaServico; }
      
      recoveryMap.push({ key, action, type });
    }
  }

  for (const entry of recoveryMap) {
    const localData = localStorage.getItem(entry.key);
    if (localData) {
      try {
        const items = JSON.parse(localData);
        if (Array.isArray(items) && items.length > 0) {
          console.log(`Recovering ${items.length} items from ${entry.key}...`);
          let successCount = 0;
          const failedItems: any[] = [];

          for (const item of items) {
            try {
              // Remove ID and map fields
              const { id, ...cleanData } = item;
              const mappedData = mapItem(cleanData, entry.type);
              
              // Only add if it seems valid (has minimal required fields)
              // This varies by type, but we'll try/catch to let the API handle it
              await entry.action(mappedData);
              successCount++;
              totalRecovered++;
            } catch (itemErr) {
              console.warn(`Failed to recover individual item from ${entry.key}:`, itemErr);
              failedItems.push(item);
            }
          }
          console.log(`Successfully recovered ${successCount}/${items.length} items from ${entry.key}`);
          
          if (failedItems.length > 0) {
            localStorage.setItem(entry.key, JSON.stringify(failedItems));
          } else {
            localStorage.removeItem(entry.key);
          }
        }
      } catch (e) {
        console.error(`Failed to parse/recover data for ${entry.key}:`, e);
      }
    }
  }

  if (totalRecovered > 0) {
    console.log(`Successfully recovered ${totalRecovered} items in total.`);
    // Refetch everything
    await Promise.all([
      store.fetchAndaimes(),
      store.fetchPTAs(),
      store.fetchSalaMotores(),
      store.fetchArmstrong(),
      store.fetchRefrigeracao()
    ]);
  }
  
  return totalRecovered;
}
