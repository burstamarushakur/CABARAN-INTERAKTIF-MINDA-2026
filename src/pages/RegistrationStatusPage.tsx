import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Compass, 
  Printer, 
  Download, 
  XOctagon, 
  Info,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { registrationService } from '../services/registrationService';
import { exportToCSV } from '../utils/csvUtils';
import { jsPDF } from 'jspdf';

const fetchImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject(new Error('Failed to get 2d context'));
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

export default function RegistrationStatusPage() {
  const navigate = useNavigate();
  const [refNo, setRefNo] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searched, setSearched] = useState(false);
  const [regData, setRegData] = useState<any>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value.replace(/\D/g, ''));
  };

  const handleSearchCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSearched(false);
    setRegData(null);

    if (!refNo.trim()) {
      setErrorMsg('Sila isi Nombor Rujukan Pendaftaran.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setErrorMsg('Sila isi nombor telefon Guru Pengiring yang sah.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_registration_status', {
        input_registration_ref: refNo.trim().toUpperCase(),
        input_teacher_phone: phone.replace(/\D/g, '')
      });

      if (error) {
        console.error('Check status error:', error);
        setErrorMsg("Semakan gagal. Sila cuba semula.");
        return;
      }

      let payload = data;
      if (Array.isArray(payload)) payload = payload[0];
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      }

      if (!payload) {
        setErrorMsg("Pendaftaran tidak ditemui atau data tidak lengkap.");
        return;
      }

      if (payload.found === false) {
        setErrorMsg("Pendaftaran tidak ditemui. Pastikan No. Rujukan Pendaftaran dan nombor telefon guru pengiring adalah betul.");
        return;
      }

      setRegData(payload);
      setSearched(true);
    } catch (err: any) {
      console.error('Check status catch error:', err);
      setErrorMsg('Semakan gagal. Sila cuba semula.');
    } finally {
      setLoading(false);
    }
  };

  // Mask MyKid/MyKad number
  const maskICNumber = (ic: string) => {
    if (!ic) return '-';
    const cleaned = ic.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      const last4 = cleaned.slice(-4);
      return `********${last4}`;
    }
    return ic;
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!regData || !regData.students) return;

    // Map students for CSV
    const rows = regData.students.map((student: any) => ({
      'Nama_Murid': student.student_name || student.name || '',
      'No_IC_Masked': student.ic_masked || maskICNumber(student.ic_number),
      'Kod_Akses': regData.registration_status === 'approved' ? (student.access_code || 'Belum Dijana') : 'TIADA AKSES (PENDING)',
      'No_Rujukan': regData.registration_ref,
      'Sekolah': regData.school_name,
      'Kod_Sekolah': regData.school_code,
      'PPD': regData.ppd,
      'Negeri': regData.state
    }));

    exportToCSV(rows, `Kod_Akses_${regData.school_code}_CIM2026`);
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!regData || !regData.students) return;

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');

    // Header letterhead with Logo and titles
    try {
      const imgBase64 = await fetchImageAsBase64("https://i.postimg.cc/bJ9vLS0y/CIM-2026.png");
      doc.addImage(imgBase64, 'PNG', 15, 10, 22, 22);
      
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.setFontSize(11.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('CABARAN INTERAKTIF MINDA TAHUN 2026', 42, 16);
      
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('SENARAI KOD AKSES MURID', 42, 22);
      doc.text('Anjuran: Sekolah Kebangsaan Sungai Abong & PIBG SK Sungai Abong', 42, 27);
    } catch (err) {
      console.warn('Failed to load logo in PDF, rendering text only:', err);
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.setFontSize(11.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('CABARAN INTERAKTIF MINDA TAHUN 2026', 15, 16);
      
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('SENARAI KOD AKSES MURID', 15, 22);
      doc.text('Anjuran: Sekolah Kebangsaan Sungai Abong & PIBG SK Sungai Abong', 15, 27);
    }

    // Divider line
    doc.setDrawColor(30, 58, 138); // Blue-900
    doc.setLineWidth(0.8);
    doc.line(15, 34, 195, 34);

    // Metadata card
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text('MAKLUMAT SEKOLAH & GURU PENGIRING', 15, 45);

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(15, 47, 195, 47);

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    let y = 55;
    const labels = [
      ['Negeri:', regData.state],
      ['PPD:', regData.ppd],
      ['Sekolah:', regData.school_name],
      ['Kod Sekolah:', regData.school_code],
      ['Nombor Rujukan Pendaftaran:', regData.registration_ref],
      ['Guru Pengiring / Mentor:', regData.teacher_name],
      ['Status Pengesahan:', String(regData.registration_status || '').toUpperCase()]
    ];

    labels.forEach(([label, value]) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(label, 15, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(String(value || '-').toUpperCase(), 75, y);
      y += 6.5;
    });

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.text('SENARAI KOD AKSES PIN CALON KUIZ:', 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    // Students table
    doc.setFont('Helvetica', 'bold');
    doc.text('BIL', 15, y);
    doc.text('NAMA PENUH MURID', 25, y);
    doc.text('MYKID / MYKAD (MASKED)', 125, y);
    doc.text('KOD AKSES', 170, y);
    y += 2;
    doc.line(15, y, 195, y);
    y += 6;

    doc.setFont('Helvetica', 'normal');
    regData.students.forEach((student: any, idx: number) => {
      doc.text(String(idx + 1), 15, y);
      doc.text((student.student_name || student.name || '').toUpperCase(), 25, y);
      doc.text(student.ic_masked || maskICNumber(student.ic_number), 125, y);
      
      const codeLabel = regData.registration_status === 'approved' ? String(student.access_code || 'PENDING') : 'DISEKAT';
      doc.setFont('Courier', 'bold');
      doc.text(codeLabel, 170, y);
      doc.setFont('Helvetica', 'normal');
      
      y += 7.5;
      if (y > 270) {
        doc.addPage();
        y = 20;

        // Redraw table header on new page
        doc.setFont('Helvetica', 'bold');
        doc.text('BIL', 15, y);
        doc.text('NAMA PENUH MURID', 25, y);
        doc.text('MYKID / MYKAD (MASKED)', 125, y);
        doc.text('KOD AKSES', 170, y);
        y += 2;
        doc.line(15, y, 195, y);
        y += 6;
        doc.setFont('Helvetica', 'normal');
      }
    });

    y += 10;
    if (y > 275) {
      doc.addPage();
      y = 30;
    }
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Cetakan berkomputer rasmi Cabaran Interaktif Minda Tahun 2026.', 15, y);

    doc.save(`Senarai_Kod_Akses_${regData.school_code}_CIM2026.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 py-3 px-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://i.postimg.cc/bJ9vLS0y/CIM-2026.png" 
            alt="CIM 2026" 
            className="h-10 w-auto object-contain mix-blend-multiply"
          />
          <div>
            <span className="text-xs font-bold text-blue-900 block tracking-tight uppercase">Semakan Status</span>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Cabaran Interaktif Minda 2026</span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 tracking-tight transition cursor-pointer"
        >
          Laman Utama
        </button>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        
        {/* Search Check Card Form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            Semak Status Pendaftaran Peserta
          </h2>
          <p className="text-xs text-slate-500 mb-6 font-medium uppercase tracking-wider">
            Sila masukkan No. Rujukan dan Nombor Telefon Guru Pengiring yang didaftarkan.
          </p>

          <form onSubmit={handleSearchCheck} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">No. Rujukan Pendaftaran</label>
                <input 
                  type="text" 
                  placeholder="CIM-2026-JBA5095-0001"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value.toUpperCase())}
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold text-slate-755 uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">No. Telefon Guru Pengiring</label>
                <input 
                  type="text" 
                  placeholder="0123456789"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold text-slate-755 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Menyemak...
                </>
              ) : (
                <>
                  Semak Status <Compass className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-5 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-4 mb-8">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900 mb-1">Semakan Gagal</h4>
              <p className="text-xs font-semibold text-red-700 leading-relaxed uppercase tracking-tight">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ==================== SEMAKAN RESULT CARD ==================== */}
        {searched && regData && (
          <div className="space-y-6">
            
            {/* 1. Status overview section */}
            <div className={`bg-white rounded-3xl border p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
              regData.registration_status === 'approved' 
                ? 'border-emerald-200 bg-emerald-50/5' 
                : regData.registration_status === 'rejected'
                  ? 'border-red-200 bg-red-50/5'
                  : 'border-amber-200 bg-amber-50/5'
            }`}>
              
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                  regData.registration_status === 'approved'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : regData.registration_status === 'rejected'
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-amber-50 border-amber-200 text-amber-600'
                }`}>
                  {regData.registration_status === 'approved' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : regData.registration_status === 'rejected' ? (
                    <XOctagon className="w-8 h-8" />
                  ) : (
                    <Clock className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status Pendaftaran</span>
                  <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                    {regData.registration_status === 'approved' ? (
                      <span className="text-emerald-700">Diluluskan</span>
                    ) : regData.registration_status === 'rejected' ? (
                      <span className="text-red-700">Ditolak</span>
                    ) : (
                      <span className="text-amber-700">Menunggu Semakan</span>
                    )}
                  </h3>
                  <span className="text-xs font-mono text-slate-400 tracking-wide font-bold">{regData.registration_ref}</span>
                </div>
              </div>

              {/* Mini details card */}
              <div className="text-left md:text-right text-xs font-semibold text-slate-600 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yuran Keseluruhan</span>
                <span className="text-lg font-black text-slate-800 block">RM {Number(regData.total_fee || 0).toFixed(2)}</span>
                <span className="text-[11px] text-slate-500 font-bold uppercase">{regData.school_code} • {regData.students?.length || 0} MURID</span>
              </div>
            </div>

            {/* If Rejected details */}
            {regData.registration_status === 'rejected' && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl">
                <h4 className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1">Sebab Penolakan Pendaftaran:</h4>
                <p className="text-xs font-bold text-red-750 leading-relaxed italic">
                  "{regData.rejection_reason || regData.reject_reason || 'Tiada sebab penolakan khusus dinyatakan. Sila hubungi urus setia program.'}"
                </p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-3">
                  Sila buat pembetulan atau hubungi wakil urus setia jika terdapat keperluan pendaftaran semula.
                </p>
              </div>
            )}

            {/* If Pending details warning */}
            {regData.registration_status === 'pending' && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4">
                <Clock className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 mb-1">Dalam Semakan</h4>
                  <p className="text-xs font-semibold text-amber-800 leading-relaxed uppercase tracking-tight font-mono">
                    Pendaftaran anda sedang disemak. Kod akses murid akan dipaparkan selepas bayaran disahkan.
                  </p>
                </div>
              </div>
            )}

            {/* 2. School metadata table info */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
              <h3 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 uppercase tracking-tight">Maklumat Pendaftaran Sekolah</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Nama Sekolah</span>
                  <span className="text-slate-850 font-bold uppercase block">{regData.school_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Kod Sekolah</span>
                  <span className="text-slate-850 font-bold uppercase block">{regData.school_code}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">PPD & Negeri</span>
                  <span className="text-slate-850 font-bold uppercase block">{regData.ppd} • {regData.state}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Nama Guru Pengiring</span>
                  <span className="text-slate-850 font-bold uppercase block">{regData.teacher_name}</span>
                </div>
              </div>
            </div>

            {/* 3. Students accesses Table grid */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b">
                <div>
                  <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">Senarai Calon Murid</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Nombor MyKid adalah masked untuk keselamatan privasi.</p>
                </div>

                {regData.registration_status === 'approved' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDownloadPDF}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Muat Turun Senarai Kod Akses
                    </button>
                    <button 
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Eksport CSV
                    </button>
                  </div>
                )}
              </div>

              {/* Table rendering */}
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Bil</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Nama Murid</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">MyKid / MyKad</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 uppercase text-right">Kod Akses Calon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regData.students && regData.students.length > 0 ? (
                      regData.students.map((student: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 font-semibold whitespace-nowrap">
                          <td className="p-3 text-slate-400">{idx + 1}</td>
                          <td className="p-3 text-slate-850 uppercase font-black text-xs">{student.student_name || student.name || ''}</td>
                          <td className="p-3 text-slate-500">{student.ic_masked || maskICNumber(student.ic_number)}</td>
                          <td className="p-3 text-right">
                            {regData.registration_status === 'approved' ? (
                              <span className="font-mono bg-blue-50 text-blue-900 border border-blue-100 font-black px-2.5 py-1 rounded inline-block text-xs">
                                {student.access_code || 'PENDING'}
                              </span>
                            ) : regData.registration_status === 'rejected' ? (
                              <span className="text-red-650 bg-red-50 text-[10px] leading-none px-2 py-0.5 rounded border border-red-100 uppercase tracking-wide">Ditolak</span>
                            ) : (
                              <span className="text-slate-450 bg-slate-100 text-[10px] leading-none px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">Tergantung</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic font-semibold">Tiada senarai calon ditemui.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
