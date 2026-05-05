import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Construction, LayoutDashboard, AlertCircle, BarChart3 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Andaimes from './pages/Andaimes';
import PTAs from './pages/PTAs';
import SalaMotores from './pages/SalaMotores';
import Oficina from './pages/Oficina';
import Armstrong from './pages/Armstrong';
import Refrigeracao from './pages/Refrigeracao';
import { cn } from './lib/utils';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  React.useEffect(() => {
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
          setConnectionError(`O servidor está respondendo com erro: ${pingRes.status}`);
          return;
        }

        // Step 2: Server is UP, now check database connectivity
        const healthRes = await fetch('/api/health');
        if (!healthRes.ok) {
          const data = await healthRes.json().catch(() => ({}));
          const msg = data.message || '';
          
          if (msg.includes('environment variables are missing')) {
            setConnectionError('Erro: Chaves do Supabase não configuradas nas variáveis de ambiente.');
          } else if (msg.includes('relation') || msg.includes('does not exist')) {
            setConnectionError('Erro: Tabelas do Supabase não encontradas. Execute o script supabase_migration.sql no editor SQL do Supabase.');
          } else if (msg.includes('Database error')) {
            setConnectionError(`Erro no banco de dados: ${msg}`);
          } else {
            setConnectionError(msg || `Erro na conexão com o banco de dados: ${healthRes.status}`);
          }
          return;
        }

        const healthData = await healthRes.json();
        if (healthData.status === 'ok') {
          setConnectionError(null);
        } else {
          setConnectionError('O servidor respondeu com um status inválido.');
        }
      } catch (err) {
        console.error('Connection check overall failure:', err);
        setConnectionError('Erro inesperado na verificação de conexão.');
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
          {connectionError && (
            <div className="bg-red-500 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium animate-pulse">
              <AlertCircle size={16} />
              {connectionError}
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
