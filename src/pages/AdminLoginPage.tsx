import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Home } from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);

      // Verify admin role 
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error('Akses ditolak. Anda bukan pentadbir.');
      }

      navigate('/admin/dashboard');

    } catch (err: any) {
      setError('Log masuk gagal. Sila semak emel dan katalaluan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mb-4 flex justify-start">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4 mr-2" /> Kembali ke Laman Utama
        </button>
      </div>
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Log Masuk Pentadbir</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Emel</label>
            <input 
              type="email" 
              required
              className="w-full text-white bg-slate-700 p-3 rounded border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Katalaluan</label>
            <input 
              type="password" 
              required
              className="w-full text-white bg-slate-700 p-3 rounded border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-medium mt-4 transition flex justify-center items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
