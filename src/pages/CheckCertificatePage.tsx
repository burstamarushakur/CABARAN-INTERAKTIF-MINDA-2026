import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { quizService } from '../services/quizService';
import { registrationService } from '../services/registrationService';
import { generateCertificate, generateCertificateBlob } from '../utils/pdfUtils';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { Search, Download, Loader2, Home, Award, Calendar, Timer, School, User, MapPin, FileArchive } from 'lucide-react';

export default function CheckCertificatePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'individual' | 'school'>('individual');

  // -------------------------------------------------------------
  // State for Semakan Individu
  // -------------------------------------------------------------
  const [searchMethod, setSearchMethod] = useState<'mykid' | 'code'>('mykid');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // -------------------------------------------------------------
  // State for Muat Turun Sijil Sekolah (Guru Pengiring)
  // -------------------------------------------------------------
  const [schoolRefNo, setSchoolRefNo] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolRegData, setSchoolRegData] = useState<any>(null);
  const [schoolSearched, setSchoolSearched] = useState(false);
  const [schoolError, setSchoolError] = useState('');
  const [top5List, setTop5List] = useState<any[]>([]);

  // ZIP generation status info
  const [zipGenerating, setZipGenerating] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  // -------------------------------------------------------------
  // Individual Handlers & Utilities
  // -------------------------------------------------------------
  const handleMethodChange = (method: 'mykid' | 'code') => {
    setSearchMethod(method);
    setInputValue('');
    setResult(null);
    setSearched(false);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (searchMethod === 'mykid') {
      const cleaned = rawVal.replace(/\D/g, '');
      setInputValue(cleaned);
    } else {
      setInputValue(rawVal.toUpperCase().slice(0, 6));
    }
  };

  const getScorePercentage = (data: any) => {
    const rawPercent = Number(data?.score_percent);
    if (Number.isFinite(rawPercent)) return Math.max(0, Math.min(100, Math.round(rawPercent)));

    const rawScore = Number(data?.score ?? 0);
    const total = Number(data?.total_questions ?? data?.expected_total ?? data?.out_total ?? 50);

    if (Number.isFinite(rawScore) && Number.isFinite(total) && total > 0 && rawScore <= total) {
      return Math.max(0, Math.min(100, Math.round((rawScore / total) * 100)));
    }

    if (Number.isFinite(rawScore)) return Math.max(0, Math.min(100, Math.round(rawScore)));
    return 0;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setSearched(false);

    const cleanValue = inputValue.trim();
    if (!cleanValue) return;

    if (searchMethod === 'mykid' && cleanValue.length < 6) {
      setError('Sila masukkan No. MyKid/MyKad yang sah (minimum 6 digit).');
      return;
    }
    if (searchMethod === 'code' && cleanValue.length < 6) {
      setError('Sila masukkan Kod Akses 6 aksara yang lengkap.');
      return;
    }

    setLoading(true);
    try {
      const data = await quizService.checkCertificateV2(searchMethod, cleanValue);
      if (data && data.student_id) {
        // Query the students table directly to get the actual, unmasked ic_number
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('ic_number')
          .eq('id', data.student_id)
          .single();

        if (!studentError && studentData) {
          data.real_ic_number = studentData.ic_number;
        }
      }
      setResult(data);
    } catch (err: any) {
      console.error('Error checking certificate:', err);
      setError('Gagal menyemak sijil. Sila cuba semula.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleDownloadParticipation = async () => {
    if (result) {
      setError('');
      try {
        await generateCertificate(
          result.student_name,
          result.school_name,
          getScorePercentage(result),
          'participation',
          null,
          result.real_ic_number || result.ic_number || result.ic_masked || result.masked_ic || (searchMethod === 'mykid' ? inputValue : undefined)
        );
      } catch (err: any) {
        console.error('Error generating participation certificate:', err);
        setError(err.message || 'Gagal menjana sijil penyertaan.');
      }
    }
  };

  const handleDownloadAchievement = async () => {
    if (result) {
      setError('');
      try {
        await generateCertificate(
          result.student_name,
          result.school_name,
          getScorePercentage(result),
          'achievement',
          result.achievement_rank,
          result.real_ic_number || result.ic_number || result.ic_masked || result.masked_ic || (searchMethod === 'mykid' ? inputValue : undefined)
        );
      } catch (err: any) {
        console.error('Error generating achievement certificate:', err);
        setError(err.message || 'Gagal menjana sijil pencapaian.');
      }
    }
  };

  const formatTime = (seconds: any) => {
    if (seconds === undefined || seconds === null) return '--';
    const num = Number(seconds);
    if (isNaN(num)) return seconds.toString();
    const m = Math.floor(num / 60);
    const s = num % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('ms-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  const isButtonDisabled = inputValue.length < 6;

  // -------------------------------------------------------------
  // School Tab Handlers & Utilities
  // -------------------------------------------------------------
  const maskICNumber = (ic: string) => {
    if (!ic) return '-';
    const cleaned = ic.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      const last4 = cleaned.slice(-4);
      return `********${last4}`;
    }
    return ic;
  };

  const localSanitizeFilename = (name: string): string => {
    return name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
  };

  const handleSchoolSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolError('');
    setSchoolRegData(null);
    setSchoolSearched(false);
    setSchoolLoading(true);

    const ref = schoolRefNo.trim().toUpperCase();
    const phone = teacherPhone.trim();

    if (!ref) {
      setSchoolError('Sila masukkan No. Rujukan Pendaftaran.');
      setSchoolLoading(false);
      return;
    }
    if (!phone || phone.length < 10) {
      setSchoolError('Sila isi nombor telefon Guru Pengiring yang sah.');
      setSchoolLoading(false);
      return;
    }

    try {
      const cleanedPhone = phone.replace(/\D/g, '');
      const data = await registrationService.checkRegistrationStatus(ref, cleanedPhone);

      let payload = data;
      if (Array.isArray(payload)) payload = payload[0];
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      }

      if (!payload || payload.found === false) {
        setSchoolError('Maklumat tidak ditemui. Sila semak No. Rujukan Pendaftaran dan nombor telefon guru pengiring.');
        return;
      }

      // Check global certificate release status inside adminGetCertificateStatus safely
      let isReleased = false;
      try {
        const certStatus = await quizService.adminGetCertificateStatus();
        if (certStatus) {
          isReleased = !!(certStatus.certificates_released || certStatus.released);
        }
      } catch (e) {
        console.warn('Could not fetch global cert release status:', e);
      }
      payload.isCertificatesReleased = isReleased;

      // Extract real global Top 5 list to map achievement qualifications
      const topList = await quizService.getPublicTop5().catch(() => []);
      setTop5List(topList);

      // Fetch individual certificates' results in parallel for each student
      const students = payload.students || [];
      const updatedStudents = await Promise.all(
        students.map(async (st: any) => {
          const accessCode = (st.access_code || '').trim().toUpperCase();
          if (!accessCode) {
            return { ...st, certResult: null };
          }
          try {
            const data = await quizService.checkCertificateV2('code', accessCode);
            if (data && data.student_id) {
              const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('ic_number')
                .eq('id', data.student_id)
                .single();

              if (!studentError && studentData) {
                data.real_ic_number = studentData.ic_number;
              }
            }
            return { ...st, certResult: data };
          } catch (e) {
            console.warn(`Error resolving certResult for student code ${accessCode}:`, e);
            return { ...st, certResult: null };
          }
        })
      );
      payload.students = updatedStudents;

      setSchoolRegData(payload);
      setSchoolSearched(true);
    } catch (err: any) {
      console.error('Error checking school pendaftaran:', err);
      setSchoolError('Gagal menyemak rekod sekolah. Sila cuba semula.');
    } finally {
      setSchoolLoading(false);
    }
  };

  const handleDownloadSchoolZip = async () => {
    if (!schoolRegData || !schoolRegData.students) return;

    setZipGenerating(true);
    setZipProgress('Memulakan proses penyediaan...');
    setSchoolError('');

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Folders for ZIP packaging
      const folderPenyertaan = zip.folder('PENYERTAAN');
      const folderPencapaian = zip.folder('PENCAPAIAN');

      const students = schoolRegData.students;
      const total = students.length;

      // Unmask IC lookup: query the students table safely using standard access codes
      const studentCodes = students.map((s: any) => s.access_code).filter(Boolean);
      const icMap = new Map<string, string>();

      if (studentCodes.length > 0) {
        setZipProgress('Menyemak pengesahan identiti murid dari pangkalan data...');
        const { data: dbStudents, error: dbError } = await supabase
          .from('students')
          .select('id, name, ic_number, access_code')
          .in('access_code', studentCodes);

        if (!dbError && dbStudents) {
          dbStudents.forEach((student: any) => {
            if (student.access_code && student.ic_number) {
              icMap.set(student.access_code.toUpperCase(), student.ic_number);
            }
          });
        }
      }

      // Generate in memory
      for (let i = 0; i < total; i++) {
        const student = students[i];
        const studentName = student.student_name || student.name || '';
        const nameUpper = studentName.toUpperCase().trim();
        const accessCode = (student.access_code || '').toUpperCase();

        // Get unmasked IC from mapping fallback to ic_number or certResult
        const realIc = student.certResult?.real_ic_number ||
                       student.certResult?.ic_number ||
                       icMap.get(accessCode) ||
                       student.ic_number ||
                       student.ic_masked ||
                       student.masked_ic ||
                       '';

        setZipProgress(`Menjana (${i + 1}/${total}): ${nameUpper}...`);

        // Check Top 5 / achievement eligibility using individual check results and fallback
        const top5MatchIndex = top5List.findIndex((t: any) => 
          (t.student_name || t.name || '').trim().toUpperCase() === nameUpper &&
          (t.school_code || '').trim().toUpperCase() === (schoolRegData.school_code || '').trim().toUpperCase()
        );
        const isTop5 = !!(student.certResult?.is_top5 || student.certResult?.can_download_achievement || (top5MatchIndex !== -1));
        const rank = student.certResult?.achievement_rank || (top5MatchIndex !== -1 ? (top5MatchIndex + 1) : null);

        const sanitizedName = localSanitizeFilename(studentName);

        // A. Generate Participation Cert
        const certPenyertaanBlob = await generateCertificateBlob(studentName, 'participation', null, realIc);
        if (folderPenyertaan) {
          folderPenyertaan.file(`Sijil_Penyertaan_${sanitizedName}.pdf`, certPenyertaanBlob);
        }

        // B. Generate Achievement Cert if top 5
        if (isTop5 && folderPencapaian) {
          const certPencapaianBlob = await generateCertificateBlob(studentName, 'achievement', rank, realIc);
          folderPencapaian.file(`Sijil_Pencapaian_${sanitizedName}.pdf`, certPencapaianBlob);
        }
      }

      // Compile ZIP
      setZipProgress('Memampatkan sijil ke dalam fail ZIP...');
      const contentBlob = await zip.generateAsync({ type: 'blob' });

      // Trigger automatic save
      const filename = `Sijil_CIM2026_${schoolRegData.school_code || 'SEKOLAH'}_${schoolRegData.registration_ref || 'REG'}.zip`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(contentBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setZipProgress('Muat turun bundle sijil telah berjaya dijana.');
    } catch (err: any) {
      console.error('ZIP compilation error:', err);
      setSchoolError('Gagal menjana bundle sijil sekolah. Sila cuba semula.');
    } finally {
      setZipGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 py-8 sm:py-12">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center text-sm font-semibold text-slate-500 hover:text-blue-900 transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4 mr-2" /> Kembali ke Laman Utama
        </motion.button>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Semakan & Keputusan</h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2">Semak keputusan penilaian minda dan muat turun sijil pencapaian kuiz digital.</p>
          </div>

          {/* Tab switcher - Semakan Individu vs Sijil Sekolah */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl max-w-md mx-auto mb-8 border border-slate-200/40">
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'individual'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semakan Individu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('school')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'school'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semakan Kelompok (Guru Pengiring)
            </button>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* TAB 1: INDIVIDUAL SEMAKAN                                    */}
          {/* ------------------------------------------------------------ */}
          {activeTab === 'individual' && (
            <div className="animate-in fade-in duration-200">
              {/* Search Method Selector */}
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">Kaedah Semakan</label>
                <div className="flex bg-slate-100 p-1.5 rounded-xl max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => handleMethodChange('mykid')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                      searchMethod === 'mykid'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    No. MyKid/MyKad
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMethodChange('code')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                      searchMethod === 'code'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kod 6 Aksara
                  </button>
                </div>
              </div>

              <form onSubmit={handleSearch} className="mb-8 max-w-lg mx-auto">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {searchMethod === 'mykid' ? 'Masukkan No. MyKid/MyKad' : 'Masukkan Kod Akses'}
                  </label>
                  <input
                    type="text"
                    placeholder={searchMethod === 'mykid' ? 'Contoh: 120101010101' : 'Contoh: 1234AB'}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg transition font-medium text-slate-800 placeholder:text-slate-350"
                    value={inputValue}
                    onChange={handleInputChange}
                    maxLength={searchMethod === 'mykid' ? 12 : 6}
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    {searchMethod === 'mykid' 
                      ? 'Masukkan nombor sahaja tanpa sebarang tanda sempang (-).' 
                      : 'Maklumat kod akses mengandungi 4 angka terakhir MyKid/MyKad diikuti 2 huruf.'}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: (loading || isButtonDisabled) ? 1 : 1.015 }}
                  whileTap={{ scale: (loading || isButtonDisabled) ? 1 : 0.985 }}
                  type="submit"
                  disabled={loading || isButtonDisabled}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer text-lg disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Menyemak...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" /> Semak Sijil
                    </>
                  )}
                </motion.button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="max-w-lg mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 font-semibold text-sm animate-in fade-in duration-200">
                  {error}
                </div>
              )}

              {/* Not Found */}
              {searched && !error && !result && (
                <div className="max-w-lg mx-auto bg-slate-50 rounded-xl border border-slate-200 p-6 text-center animate-in fade-in duration-200">
                  <span className="text-3xl mb-3 block">🔍</span>
                  <p className="text-slate-700 font-semibold text-base leading-relaxed">
                    Rekod sijil tidak ditemui. Pastikan maklumat yang dimasukkan betul dan kuiz telah dihantar.
                  </p>
                </div>
              )}

              {/* Result Found */}
              {searched && !error && result && (
                <div className="max-w-xl mx-auto bg-emerald-50/50 rounded-2xl border-2 border-emerald-100 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Rekod Keputusan Kuiz</h3>
                        <p className="text-xs text-slate-500">
                          {result.certificates_released 
                            ? 'Sijil anda telah sedia untuk dimuat turun.' 
                            : 'Sijil belum bersedia untuk dimuat turun.'}
                        </p>
                      </div>
                    </div>

                    {/* Display Top 5 Badge if applicable */}
                    {result.certificates_released && result.is_top5 && (
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          🏅 Top 5 Keseluruhan
                        </span>
                        {result.achievement_rank && (
                          <span className="text-xs font-semibold text-amber-600">
                            Kedudukan: #{result.achievement_rank}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 shadow-xs">
                      <User className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold block">Nama Murid</span>
                        <span className="font-bold text-slate-800 text-sm sm:text-base leading-snug">{result.student_name}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 shadow-xs">
                      <School className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold block">Nama Sekolah</span>
                        <span className="font-bold text-slate-800 text-sm leading-snug">{result.school_name}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 shadow-xs">
                      <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold block">Negeri</span>
                        <span className="font-bold text-slate-800 text-sm sm:text-base leading-snug">{result.state || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 shadow-xs">
                      <Award className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold block">Markah</span>
                        <span className="font-bold text-blue-600 text-lg">{getScorePercentage(result)}%</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 shadow-xs">
                      <Timer className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold block">Masa Diambil</span>
                        <span className="font-bold text-slate-800 text-sm sm:text-base">{formatTime(result.time_taken_seconds)}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3 shadow-xs">
                      <Calendar className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold block">Tarikh Selesai</span>
                        <span className="font-semibold text-slate-700 text-xs sm:text-sm">{formatDate(result.completed_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Conditional Actions and Messages */}
                  {!result.certificates_released ? (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-slate-700 text-sm leading-relaxed text-justify">
                      Rekod kuiz dijumpai, tetapi sijil belum boleh dimuat turun. Sijil akan tersedia selepas pihak penganjur mendapat pengiktirafan program daripada BSKK, KPM.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {result.can_download_participation && (
                        <motion.button
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={handleDownloadParticipation}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-base shadow-xs"
                        >
                          <Download className="w-5 h-5" /> Muat Turun Sijil Penyertaan (PDF)
                        </motion.button>
                      )}
                      {result.can_download_achievement && (
                        <motion.button
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={handleDownloadAchievement}
                          className="w-full py-4 bg-amber-600 hover:bg-amber-700 hover:shadow-md text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-base shadow-xs"
                        >
                          <Download className="w-5 h-5" /> Muat Turun Sijil Pencapaian (PDF)
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* TAB 2: GURU PENGIRING SCHOOL BUNDLE                          */}
          {/* ------------------------------------------------------------ */}
          {activeTab === 'school' && (
            <div className="animate-in fade-in duration-200">
              <form onSubmit={handleSchoolSearch} className="mb-8 max-w-lg mx-auto">
                <div className="mb-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      No. Rujukan Pendaftaran
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: CIM-2026-JBA5095-0001"
                      className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg transition font-medium text-slate-800 placeholder:text-slate-350"
                      value={schoolRefNo}
                      onChange={(e) => setSchoolRefNo(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      No. Telefon Guru Pengiring
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 0123456789"
                      className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg transition font-medium text-slate-800 placeholder:text-slate-350"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: schoolLoading ? 1 : 1.015 }}
                  whileTap={{ scale: schoolLoading ? 1 : 0.985 }}
                  type="submit"
                  disabled={schoolLoading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer text-lg disabled:cursor-not-allowed"
                >
                  {schoolLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Menyemak...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" /> Semak Sijil Sekolah
                    </>
                  )}
                </motion.button>
              </form>

              {/* School Error Message */}
              {schoolError && (
                <div className="max-w-lg mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 font-semibold text-sm animate-in fade-in duration-200">
                  {schoolError}
                </div>
              )}

              {/* School Registration Details */}
              {schoolSearched && !schoolError && schoolRegData && (
                <div className="space-y-6">
                  <div className="bg-slate-50/75 rounded-2xl border border-slate-200 p-6 animate-in fade-in duration-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200/60 uppercase tracking-widest text-center">
                      Maklumat Sekolah & Pendaftaran
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm font-semibold text-slate-650">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nama Sekolah</span>
                        <span className="text-slate-800 font-black uppercase text-xs block leading-tight">{schoolRegData.school_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kod Sekolah</span>
                        <span className="text-slate-800 font-bold uppercase block">{schoolRegData.school_code}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">PPD & Negeri</span>
                        <span className="text-slate-800 font-medium block">{schoolRegData.ppd} • {schoolRegData.state}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Guru Pengiring</span>
                        <span className="text-slate-800 font-medium block">{schoolRegData.teacher_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jumlah Murid</span>
                        <span className="text-slate-800 font-bold block">{schoolRegData.students?.length ?? 0} orang</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status Sijil Sekolah</span>
                        <span className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded border uppercase mt-1 ${
                          schoolRegData.isCertificatesReleased
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {schoolRegData.isCertificatesReleased ? 'SUDAH RELEASE' : 'BELUM RELEASE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* If Certificates released OR not */}
                  {!schoolRegData.isCertificatesReleased ? (
                    <div className="p-5 bg-amber-50/75 border border-amber-200 rounded-2xl animate-in fade-in duration-200">
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Sijil Belum Ditutup / Dijana:</h4>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed italic text-justify">
                        Sijil belum dibuka untuk dimuat turun oleh pihak penganjur. Sila hubungi urus setia program jika terdapat sebarang pertanyaan kuiz.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Bundle Action */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 p-6 rounded-2xl text-center shadow-xs">
                        <h4 className="font-black text-blue-900 text-base mb-1 uppercase tracking-wide">Muat Turun Bundle Sijil Sekolah</h4>
                        <p className="text-slate-500 text-xs font-semibold mb-5 max-w-md mx-auto leading-relaxed">
                          Muat turun semua sijil penyertaan dan sijil pencapaian (Top 5) untuk keseluruhan murid berdaftar di bawah pendaftaran ini secara terus dalam satu fail ZIP.
                        </p>
                        
                        <motion.button
                          whileHover={{ scale: zipGenerating ? 1 : 1.02 }}
                          whileTap={{ scale: zipGenerating ? 1 : 0.98 }}
                          onClick={handleDownloadSchoolZip}
                          disabled={zipGenerating}
                          className="mx-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2.5 cursor-pointer shadow-sm text-sm sm:text-base disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                          {zipGenerating ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" /> Menjana ZIP Sijil...
                            </>
                          ) : (
                            <>
                              <FileArchive className="w-5 h-5" /> Muat Turun Semua Sijil Sekolah Ini (ZIP)
                            </>
                          )}
                        </motion.button>

                        {zipProgress && (
                          <div className="mt-3.5 text-xs font-black text-blue-800 animate-pulse">
                            {zipProgress}
                          </div>
                        )}
                      </div>

                      {/* Display registered student lists */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Senarai Rekod Murid & Sijil Tersedia
                        </h4>
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
                          <table className="w-full text-left text-xs text-slate-600 border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase w-12 text-center">Bil</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Nama Calon Murid</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase w-32">MyKid / MyKad</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase w-32">Kod Akses</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase text-right w-36">Sijil Layak</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schoolRegData.students && schoolRegData.students.length > 0 ? (
                                schoolRegData.students.map((student: any, idx: number) => {
                                  const nameUpper = (student.student_name || student.name || '').toUpperCase().trim();
                                  const isTop5Fallback = top5List.some((t: any) => 
                                    (t.student_name || t.name || '').trim().toUpperCase() === nameUpper &&
                                    (t.school_code || '').trim().toUpperCase() === (schoolRegData.school_code || '').trim().toUpperCase()
                                  );
                                  const isTop5 = !!(student.certResult?.is_top5 || student.certResult?.can_download_achievement || isTop5Fallback);
                                  return (
                                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 font-semibold whitespace-nowrap">
                                      <td className="p-3 text-slate-400 text-center">{idx + 1}</td>
                                      <td className="p-3 text-slate-850 uppercase font-black text-xs">{student.student_name || student.name || ''}</td>
                                      <td className="p-3 text-slate-500 font-mono text-[11px]">{maskICNumber(student.ic_number || student.ic_masked || student.masked_ic)}</td>
                                      <td className="p-3">
                                        <span className="font-mono bg-blue-50 text-blue-900 border border-blue-100 font-extrabold px-2 py-0.5 rounded text-[11px]">
                                          {student.access_code || 'PENDING'}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        <span className="inline-flex flex-col items-end gap-1">
                                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/60 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wide">
                                            Penyertaan
                                          </span>
                                          {isTop5 && (
                                            <span className="bg-amber-50 text-amber-700 border border-amber-100/60 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wide">
                                              🏅 Pencapaian
                                            </span>
                                          )}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                    Tiada data murid ditemui untuk pendaftaran ini.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
