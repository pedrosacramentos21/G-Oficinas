import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Construction, LayoutDashboard, AlertCircle } from 'lucide-react';
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
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.status !== 'ok') {
          setConnectionError('Erro de conexão com o banco de dados no servidor.');
        } else {
          setConnectionError(null);
        }
      } catch (err) {
        setConnectionError('Não foi possível verificar a conexão com o servidor.');
      }
    };
    checkConnection();
  }, []);

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
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
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
          <div className="lg:hidden bg-[#1e293b] text-white p-4 flex items-center justify-between shadow-md">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Construction className="text-orange-500" size={20} />
              G-Oficinas
            </h1>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <LayoutDashboard size={24} />
            </button>
          </div>

          <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
            <Routes>
              <Route path="/andaimes/*" element={<Andaimes />} />
              <Route path="/ptas" element={<PTAs />} />
              <Route path="/sala-motores" element={<SalaMotores />} />
              <Route path="/oficina" element={<Oficina />} />
              <Route path="/armstrong" element={<Armstrong />} />
              <Route path="/refrigeracao" element={<Refrigeracao />} />
              <Route path="/" element={<Navigate to="/andaimes" replace />} />
              <Route path="*" element={<div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase tracking-widest">Módulo em desenvolvimento</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
