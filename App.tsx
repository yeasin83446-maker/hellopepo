import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { UploadPage } from './pages/UploadPage';
import { FileDetailPage } from './pages/FileDetailPage';
import { CategoryPage } from './pages/CategoryPage';
import { SearchPage } from './pages/SearchPage';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/file/:id" element={<FileDetailPage />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        
        {/* Simple Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} Hello Pepo. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-green-400 transition">Terms</a>
              <a href="#" className="hover:text-green-400 transition">Privacy Policy</a>
              <a href="#" className="hover:text-green-400 transition">DMCA</a>
            </div>
          </div>
        </footer>
      </div>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155'
          },
          success: {
            iconTheme: { primary: '#4ade80', secondary: '#020617' }
          }
        }} 
      />
    </BrowserRouter>
  );
}
