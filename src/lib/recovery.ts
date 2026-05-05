import { useStore } from '../store';

/**
 * Helper to recover data from LocalStorage if it existed before the migration to Supabase.
 * Most common keys used in previous versions.
 */
export async function syncLocalStorageToSupabase() {
  const store = useStore.getState();
  
  const recoveryMap = [
    { key: 'andaimes_data', action: store.addAndaime },
    { key: 'ptas_data', action: store.addPTA },
    { key: 'ptas_activities', action: store.addPTA },
    { key: 'sala_motores_activities', action: store.addAtividadeSalaMotores },
    { key: 'sala_motores_data', action: store.addAtividadeSalaMotores },
    { key: 'atividades_sala_motores', action: store.addAtividadeSalaMotores },
    { key: 'armstrong_manutencoes', action: store.addArmstrongManutencao },
    { key: 'armstrong_data', action: store.addArmstrongManutencao },
    { key: 'armstrong_backlog', action: store.addArmstrongBacklog },
    { key: 'refrigeracao_manutencoes', action: store.addRefrigeracaoManutencao },
    { key: 'refrigeracao_data', action: store.addRefrigeracaoManutencao },
    { key: 'refrigeracao_backlog', action: store.addRefrigeracaoBacklog },
    { key: 'oficina_servicos', action: store.addOficinaServico },
  ];

  let recoveredCount = 0;

  for (const entry of recoveryMap) {
    const localData = localStorage.getItem(entry.key);
    if (localData) {
      try {
        const items = JSON.parse(localData);
        if (Array.isArray(items) && items.length > 0) {
          console.log(`Recovering ${items.length} items from ${entry.key}...`);
          for (const item of items) {
            // Remove ID to let Supabase generate a new one
            const { id, ...data } = item;
            await entry.action(data);
            recoveredCount++;
          }
          // After successful sync, we could clear it, but let's keep it safe for now
          // localStorage.removeItem(entry.key);
        }
      } catch (e) {
        console.error(`Failed to recover data for ${entry.key}:`, e);
      }
    }
  }

  if (recoveredCount > 0) {
    console.log(`Successfully recovered ${recoveredCount} items.`);
    // Trigger a global fetch to refresh the UI
    store.fetchAndaimes();
    store.fetchPTAs();
    store.fetchSalaMotores();
    store.fetchArmstrong();
    store.fetchRefrigeracao();
  }
  
  return recoveredCount;
}
