import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import { AlertTriangle, PlayCircle, Home } from 'lucide-react';

export default function QuizInstructionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { accessCode, studentData } = location.state || {};

  if (!accessCode) {
    return <Navigate to="/login" replace />;
  }

  const handleStart = () => {
    navigate('/quiz', { state: { accessCode, studentData } });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-900 transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4 mr-2" /> Kembali ke Laman Utama
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
          <h2 className="text-3xl font-bold text-slate-800 border-b pb-4">Arahan Kuiz</h2>
          
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Maklumat Calon:</h3>
            <p className="text-slate-700">Nama: <span className="font-bold">{studentData.student_name}</span></p>
            <p className="text-slate-700">Sekolah: <span className="font-bold">{studentData.school_name}</span></p>
          </div>

          <div className="space-y-4 text-slate-700 text-lg">
            <p>1. Kuiz ini mengandungi soalan berkaitan dengan Unit Beruniform.</p>
            <p>2. Anda diberi masa <strong>2 jam</strong> (120 minit) untuk menjawab semua soalan.</p>
            <p>3. Masa akan mula dikira sebaik sahaja anda menekan butang 'Mula Kuiz'.</p>
            <p>4. Anda boleh kembali ke soalan sebelumnya jika masih ada baki masa.</p>
            <div className="flex bg-yellow-50 p-4 border-l-4 border-yellow-400 text-yellow-800 rounded">
              <AlertTriangle className="w-6 h-6 mr-3 flex-shrink-0" />
              <p className="text-sm">Amaran: Pastikan capaian internet anda stabil. Jangan tutup pelayar web (browser) semasa menjawab kuiz.</p>
            </div>
          </div>

          <div className="pt-8 text-center pt-8 border-t">
            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition shadow hover:shadow-lg"
            >
              <PlayCircle className="w-6 h-6 mr-2" /> Mula Kuiz Sekarang
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
