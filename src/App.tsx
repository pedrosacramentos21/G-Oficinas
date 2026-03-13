import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Andaimes from './pages/Andaimes';
import PTAs from './pages/PTAs';
import SalaMotores from './pages/SalaMotores';
import Oficina from './pages/Oficina';
import Armstrong from './pages/Armstrong';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Routes>
            <Route path="/andaimes/*" element={<Andaimes />} />
            <Route path="/ptas" element={<PTAs />} />
            <Route path="/sala-motores" element={<SalaMotores />} />
            <Route path="/oficina" element={<Oficina />} />
            <Route path="/armstrong" element={<Armstrong />} />
            <Route path="/" element={<Navigate to="/andaimes" replace />} />
            <Route path="*" element={<div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase tracking-widest">Módulo em desenvolvimento</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
