import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Construction, LayoutDashboard, AlertCircle, BarChart3, Database, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { useStore } from './store';
import Andaimes from './pages/Andaimes';
import PTAs from './pages/PTAs';
import SalaMotores from './pages/SalaMotores';
import Oficina from './pages/Oficina';
import Armstrong from './pages/Armstrong';
import Refrigeracao from './pages/Refrigeracao';
import { syncLocalStorageToSupabase } from './lib/recovery';
import { cn } from './lib/utils';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [hasLocalData, setHasLocalData] = React.useState(false);
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);

  const { error: storeError, setError: setStoreError } = useStore();

  React.useEffect(() => {
    // Check for local data that could be recovered
    const prefixes = ['andaimes', 'ptas', 'sala_motores', 'atividades', 'armstrong', 'refrigeracao', 'oficina'];
    const allKeys = Object.keys(localStorage);
    const foundData = allKeys.some(key => {
      if (!prefixes.some(p => key.startsWith(p))) return false;
      const data = localStorage.getItem(key);
      try {
        if (!data) return false;
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    });
    
    if (foundData && !isRecovering) {
      console.log('Dados locais detectados, iniciando recuperação automática...');
      const recover = async () => {
        setIsRecovering(true);
        try {
          const count = await syncLocalStorageToSupabase();
          console.log(`${count} registros recuperados automaticamente.`);
          // Importante: forçar refresh do store após sucesso
          const store = useStore.getState();
          await Promise.all([
            store.fetchAndaimes(),
            store.fetchPTAs(),
            store.fetchSalaMotores(),
            store.fetchArmstrong(),
            store.fetchRefrigeracao(),
            store.fetchOficina()
          ]);
        } catch (err) {
          console.error('Falha na recuperação automática:', err);
        } finally {
          setIsRecovering(false);
          setHasLocalData(false);
        }
      };
      recover();
    } else {
      setHasLocalData(foundData);
    }

    const checkConnection = async () => {
      try {
        // Step 1: Check if the server is even running
        let pingRes;
        try {
          pingRes = await fetch('/api/ping');
        } catch (fetchErr) {
          console.error('Server ping failed:', fetchErr);
          setConnectionError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
          return;
        }

        if (!pingRes.ok) {
          const bodyText = await pingRes.text().catch(() => '');
          if (bodyText.includes('Forbidden') || pingRes.status === 403) {
            setConnectionError(`Erro 403: Acesso Negado ao Servidor. Verifique as configurações de deploy e CORS.`);
          } else {
            setConnectionError(`O servidor está respondendo com erro: ${pingRes.status}`);
          }
          return;
        }

        // Step 2: Server is UP, now check database connectivity
        const healthRes = await fetch('/api/health');
        if (!healthRes.ok) {
          let msg = '';
          try {
            const data = await healthRes.json();
            msg = data.message || '';
          } catch (e) {
            msg = await healthRes.text().catch(() => `Erro ${healthRes.status}`);
          }
          
          if (msg.includes('environment variables are missing') || msg.includes('Supabase environment variables')) {
            setConnectionError('Erro: Chaves do Supabase não configuradas nas variáveis de ambiente em produção.');
          } else if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('não encontrada')) {
            setConnectionError('Erro: Tabelas do Supabase não encontradas. Execute o script supabase_migration.sql no editor SQL do Supabase.');
          } else if (msg.includes('Database error') || msg.includes('Supabase database error')) {
            setConnectionError(`Erro no banco de dados: ${msg}`);
          } else {
            setConnectionError(msg || `Erro na conexão com o banco de dados: ${healthRes.status}`);
          }
          return;
        }

        const healthData = await healthRes.json();
        setCounts(healthData.counts || {});
        if (healthData.status === 'ok') {
          setConnectionError(null);
        } else {
          setConnectionError(healthData.message || 'O servidor respondeu com um status inválido.');
        }
      } catch (err: any) {
        console.error('Connection check overall failure:', err);
        setConnectionError(`Erro inesperado na verificação de conexão: ${err?.message || 'Erro desconhecido'}`);
      }
    };
    
    // Initial check
    checkConnection();
    
    // Retry every 30 seconds if there's an error
    const interval = setInterval(() => {
      if (connectionError) checkConnection();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [connectionError]);

  const activeError = connectionError || storeError;

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <div className={cn(
          "fixed inset-y-0 left-0 z-[70] lg:relative lg:z-50 transition-all duration-300 transform",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isSidebarCollapsed ? "lg:w-20" : "lg:w-72"
        )}>
          <Sidebar 
            collapsed={isSidebarCollapsed} 
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeError && (
            <div className="bg-red-500 text-white px-4 py-2 flex flex-col gap-1 z-50">
              <div className="flex items-center justify-between gap-2 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  {activeError}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowDebug(!showDebug)}
                    className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase"
                  >
                    {showDebug ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                  </button>
                  <button 
                    onClick={() => {
                      setConnectionError(null);
                      setStoreError(null);
                    }}
                    className="hover:bg-white/20 p-1 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              {showDebug && (
                <div className="bg-black/20 p-2 rounded mt-1 text-[10px] font-mono grid grid-cols-2 sm:grid-cols-5 gap-2 border border-white/10">
                  {Object.entries(counts).map(([table, count]) => (
                    <div key={table} className="flex justify-between border-r border-white/10 pr-2 last:border-0">
                      <span className="opacity-70 truncate">{table.replace('solicitacoes_', '').replace('_servicos', '')}:</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {isRecovering && (
            <div className="bg-ambev-blue text-amber-400 px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold animate-pulse">
              <Database size={16} />
              SINCRONIZANDO DADOS... AGUARDE
            </div>
          )}
          
          {/* Mobile Header */}
          <div className="lg:hidden bg-ambev-blue text-white p-4 flex items-center justify-between shadow-md border-b border-white/10">
            <h1 className="text-lg font-black flex items-center gap-2 uppercase italic tracking-tighter">
              <div className="w-8 h-8 bg-ambev-gold rounded-lg flex items-center justify-center shrink-0">
                <Construction className="text-ambev-blue" size={18} />
              </div>
              Ambev <span className="text-ambev-gold">Ops</span>
            </h1>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg text-ambev-gold transition-colors"
            >
              <LayoutDashboard size={24} />
            </button>
          </div>

          <main className="flex-1 overflow-y-auto custom-scrollbar min-w-0">
            <div className="w-full h-full min-w-0">
              <Routes>
                <Route path="/andaimes/*" element={<Andaimes />} />
                <Route path="/ptas" element={<PTAs />} />
                <Route path="/sala-motores" element={<SalaMotores />} />
                <Route path="/oficina" element={<Oficina />} />
                <Route path="/armstrong" element={<Armstrong />} />
                <Route path="/refrigeracao" element={<Refrigeracao />} />
                <Route path="/" element={<Navigate to="/andaimes" replace />} />
                <Route path="*" element={<div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase tracking-widest text-center p-4">Módulo em desenvolvimento</div>} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}
