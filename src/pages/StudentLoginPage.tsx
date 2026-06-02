import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { quizService } from '../services/quizService';
import { ArrowRight, Loader2, Home } from 'lucide-react';
import { motion } from 'motion/react';

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) return;

    setLoading(true);
    setError('');

    try {
      const data = await quizService.validateAccessCode(accessCode.trim().toUpperCase());
      
      switch(data.status) {
        case 'INVALID':
          setError('Kod akses tidak sah.');
          break;
        case 'NOT_ACTIVE':
          setError('Kod akses belum diaktifkan oleh penganjur.');
          break;
        case 'NO_ACTIVE_SESSION':
          setError('Sesi kuiz belum diaktifkan.');
          break;
        case 'NOT_STARTED':
          setError('Sesi kuiz belum bermula.');
          break;
        case 'ENDED':
          setError('Sesi kuiz telah tamat.');
          break;
        case 'COMPLETED':
          setError('Anda sudah selesai menjawab.');
          break;
        case 'VALID':
          navigate('/instructions', { 
            state: { 
              accessCode: accessCode.trim().toUpperCase(),
              studentData: data 
            } 
          });
          break;
        default:
          setError('Ralat tidak diketahui.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyemak kod akses.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md mb-4 flex justify-start"
        >
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-900 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 mr-2" /> Kembali ke Laman Utama
          </button>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md"
        >
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-6">Log Masuk Murid</h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 text-center">Masukkan Kod Akses Anda</label>
              <input
                type="text"
                className="w-full text-center text-3xl tracking-widest font-mono p-4 border border-slate-300 rounded-lg uppercase focus:ring-blue-500 focus:border-blue-500"
                maxLength={6}
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                placeholder="XXXXXX"
              />
            </div>

            <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl text-justify text-xs text-slate-700 leading-relaxed font-semibold">
              <p className="font-bold text-amber-900 border-b border-amber-200 pb-1 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                ⚠️ Peringatan Masa Menjawab
              </p>
              Tempoh menjawab kuiz adalah selama 2 jam bagi setiap peserta. Walau bagaimanapun, sesi menjawab kuiz akan tamat sepenuhnya pada jam 6.00 petang. Peserta yang mula menjawab lewat perlu memastikan kuiz dihantar sebelum waktu tamat tersebut. Selepas jam 6.00 petang, sistem akan menamatkan sesi menjawab secara automatik.
            </div>

            {error && <div className="text-red-500 bg-red-50 p-3 rounded text-sm text-center">{error}</div>}

            <motion.button
              whileHover={{ scale: (loading || accessCode.length < 6) ? 1 : 1.015 }}
              whileTap={{ scale: (loading || accessCode.length < 6) ? 1 : 0.985 }}
              type="submit"
              disabled={loading || accessCode.length < 6}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Masuk <ArrowRight className="w-5 h-5 ml-2" /></>}
            </motion.button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
