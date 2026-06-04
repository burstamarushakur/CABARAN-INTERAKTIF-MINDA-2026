import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DatabaseZap,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  FeederSchool,
  feederImportService,
} from '../services/feederImportService';

interface FeederImportPanelProps {
  onImported?: () => void | Promise<void>;
}

export default function FeederImportPanel({ onImported }: FeederImportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [schools, setSchools] = useState<FeederSchool[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingCode, setImportingCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await feederImportService.getImportData();
      setSchools(data.sekolah || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca data daripada Google Sheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && schools.length === 0 && !loading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filteredSchools = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return schools;

    return schools.filter((school) => {
      return [
        school.kodSekolah,
        school.namaSekolah,
        school.negeri,
        school.ppd,
        school.namaGuru,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [schools, searchTerm]);

  const totalPendingImport = schools.filter(
    (school) => String(school.statusImport || '').toUpperCase() !== 'SUDAH DIIMPORT'
  ).length;

  const totalStudents = schools.reduce((sum, school) => sum + (school.murid?.length || 0), 0);

  const handleImport = async (school: FeederSchool) => {
    const confirmImport = window.confirm(
      `Import ${school.namaSekolah} (${school.kodSekolah}) ke CIM 2026 full?\n\nJumlah murid: ${school.murid?.length || 0}`
    );

    if (!confirmImport) return;

    setImportingCode(school.kodSekolah);
    setError('');
    setSuccess('');

    try {
      const result = await feederImportService.importSchool(school);

      setSchools((prev) =>
        prev.map((item) =>
          item.kodSekolah === school.kodSekolah
            ? { ...item, statusImport: 'SUDAH DIIMPORT' }
            : item
        )
      );

      setSuccess(
        result?.message || `${school.namaSekolah} berjaya diimport ke CIM 2026 full.`
      );

      await onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import tidak berjaya.');
    } finally {
      setImportingCode('');
    }
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-emerald-50"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-sm">
            <DatabaseZap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-emerald-950">
              Import Pendaftaran Awal Dari Google Sheet
            </h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-800/80">
              Ambil data daripada borang pendaftaran awal dan masukkan ke CIM 2026 full sebagai pendaftaran pending.
            </p>
          </div>
        </div>

        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-emerald-700" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-emerald-700" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-emerald-200 bg-white p-4">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="Sekolah Dalam Sheet" value={`${schools.length}`} />
            <MiniStat label="Belum Import" value={`${totalPendingImport}`} />
            <MiniStat label="Jumlah Murid" value={`${totalStudents}`} />
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kod sekolah, nama sekolah, negeri atau PPD..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Baca Semula Sheet
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-relaxed text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-relaxed text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3">Sekolah</th>
                  <th className="p-3">Negeri / PPD</th>
                  <th className="p-3">Guru</th>
                  <th className="p-3 text-center">Murid</th>
                  <th className="p-3">Status Bayaran</th>
                  <th className="p-3">Status Import</th>
                  <th className="p-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2 font-bold">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        Membaca data Google Sheet...
                      </div>
                    </td>
                  </tr>
                ) : filteredSchools.length > 0 ? (
                  filteredSchools.map((school) => {
                    const isImported = String(school.statusImport || '').toUpperCase() === 'SUDAH DIIMPORT';
                    const isImporting = importingCode === school.kodSekolah;

                    return (
                      <tr key={school.kodSekolah} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-3 align-top">
                          <span className="block font-black uppercase text-slate-900">{school.namaSekolah}</span>
                          <span className="mt-0.5 block font-mono text-[10px] font-bold uppercase text-slate-400">{school.kodSekolah}</span>
                        </td>
                        <td className="p-3 align-top">
                          <span className="block font-bold uppercase text-slate-700">{school.negeri}</span>
                          <span className="mt-0.5 block text-[10px] font-bold uppercase text-slate-400">{school.ppd}</span>
                        </td>
                        <td className="p-3 align-top">
                          <span className="block font-bold uppercase text-slate-700">{school.namaGuru}</span>
                          <span className="mt-0.5 block font-mono text-[10px] font-bold text-slate-400">{school.telefonGuru}</span>
                        </td>
                        <td className="p-3 text-center align-top font-black text-slate-900">{school.murid?.length || school.jumlahMurid || 0}</td>
                        <td className="p-3 align-top">
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                            {school.statusBayaran || 'BELUM DISEMAK'}
                          </span>
                        </td>
                        <td className="p-3 align-top">
                          {isImported ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                              Sudah Diimport
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                              Belum Import
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right align-top">
                          <button
                            type="button"
                            disabled={isImported || isImporting}
                            onClick={() => handleImport(school)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                          >
                            {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DatabaseZap className="h-3.5 w-3.5" />}
                            {isImported ? 'Selesai' : 'Import'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-xs font-bold text-slate-400">
                      Tiada data pendaftaran awal dijumpai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <strong className="mt-1 block text-xl font-black text-slate-900">{value}</strong>
    </div>
  );
}
