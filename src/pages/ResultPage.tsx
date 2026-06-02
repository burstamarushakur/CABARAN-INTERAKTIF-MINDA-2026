import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import { Trophy, Clock, Target, Home } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { studentData, result } = location.state || {};

  if (!studentData || !result) {
    return <Navigate to="/" replace />;
  }

  const percentage = Math.round((result.out_score / result.out_total) * 100);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  let message = "Tahniah! Teruskan usaha yang cemerlang.";
  if (percentage < 50) message = "Usaha yang baik. Cuba lagi pada masa akan datang!";
  else if (percentage >= 80) message = "Syabas! Prestasi anda amat membanggakan!";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg mb-4 flex justify-start"
        >
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-900 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 mr-2" /> Kembali ke Laman Utama
          </button>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white p-8 sm:p-12 rounded-3xl shadow-lg border border-slate-200 max-w-lg w-full text-center"
        >
          
          <div className="mb-6 flex justify-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
              className="w-24 h-24 bg-yellow-105 rounded-full flex items-center justify-center border-4 border-yellow-300 shadow-md"
            >
              <Trophy className="w-12 h-12 text-yellow-600" />
            </motion.div>
          </div>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Tahniah, {studentData.student_name}!</h2>
          <p className="text-slate-500 mb-8 font-semibold">{studentData.school_name}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="bg-blue-50 p-4 rounded-xl border border-blue-100"
            >
              <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Markah</div>
              <div className="text-2xl font-bold text-blue-700 font-mono">{result.out_score} / {result.out_total}</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="bg-emerald-50 p-4 rounded-xl border border-emerald-100"
            >
              <Clock className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Masa Diambil</div>
              <div className="text-2xl font-bold text-emerald-700 font-mono">{formatTime(result.out_time_taken)}</div>
            </motion.div>
          </div>

          <div className="bg-slate-100 p-4 rounded-xl text-slate-700 font-bold italic mb-8">
            "{message}"
          </div>

          <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl text-slate-705 text-xs text-justify font-semibold leading-relaxed mb-8 shadow-xs">
            Peserta boleh memuat turun Sijil Penyertaan / Sijil Pencapaian selepas pihak penganjur mendapat pengiktirafan program daripada pihak BSKK, KPM. Pihak sekolah/guru pengiring/peserta akan dimaklumkan sejurus selepas pengiktirafan program diberikan.
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/certificate')}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition cursor-pointer shadow-sm"
            >
              Semak Sijil
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="flex items-center justify-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer border border-slate-250 shadow-xs"
            >
              <Home className="w-5 h-5 mr-2" /> Kembali ke Laman Utama
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
