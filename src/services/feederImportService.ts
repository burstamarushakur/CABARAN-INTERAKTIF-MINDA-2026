import { supabase } from '../lib/supabaseClient';

const FEEDER_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwWA23pETE2ZNMK_eAg7SzxaNaXaijRlRCqPzu7ewvTWtiz0RlDRfEH-0torRAnhfCB/exec';

const IMPORT_TOKEN = 'CIM2026_IMPORT_7R8M2K9Q_2026';

export interface FeederStudent {
  namaMurid: string;
  noMykidMykad: string;
}

export interface FeederSchool {
  timestamp?: string;
  negeri: string;
  ppd: string;
  kodSekolah: string;
  namaSekolah: string;
  namaGuru: string;
  telefonGuru: string;
  emailGuru: string;
  statusBayaran: string;
  statusImport: string;
  catatan: string;
  jumlahMurid: number;
  murid: FeederStudent[];
}

export interface FeederImportSummary {
  sekolah: FeederSchool[];
  jumlahSekolah: number;
  jumlahMurid: number;
}

async function callFeederGas(action: string, payload: Record<string, unknown>) {
  const response = await fetch(FEEDER_GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action,
      payload: {
        ...payload,
        token: IMPORT_TOKEN,
      },
    }),
  });

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new Error('Respons daripada Google Sheet/GAS tidak sah.');
  }

  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Permintaan ke Google Sheet/GAS gagal.');
  }

  return json;
}

export const feederImportService = {
  async getImportData(): Promise<FeederImportSummary> {
    const json = await callFeederGas('getImportData', {});

    return {
      sekolah: Array.isArray(json?.data?.sekolah) ? json.data.sekolah : [],
      jumlahSekolah: Number(json?.data?.jumlahSekolah || 0),
      jumlahMurid: Number(json?.data?.jumlahMurid || 0),
    };
  },

  async importSchool(school: FeederSchool) {
    const inputPayload = {
      negeri: school.negeri,
      ppd: school.ppd,
      kodSekolah: school.kodSekolah,
      namaSekolah: school.namaSekolah,
      namaGuru: school.namaGuru,
      telefonGuru: school.telefonGuru,
      emailGuru: school.emailGuru,
      catatan: school.catatan,
      murid: (school.murid || []).map((student) => ({
        namaMurid: student.namaMurid,
        noMykidMykad: student.noMykidMykad,
      })),
    };

    const { data, error } = await supabase.rpc('admin_import_feeder_registration', {
      input_payload: inputPayload,
    });

    if (error) {
      const message = String(error.message || '');

      if (message.includes('DUPLICATE_STUDENT_IC_ALREADY_REGISTERED')) {
        throw new Error('Import gagal: Terdapat No MyKid/MyKad murid yang telah wujud dalam CIM 2026 full.');
      }

      if (message.includes('Sekolah ini telah wujud') || message.includes('already_exists')) {
        throw new Error('Import gagal: Sekolah ini telah wujud dalam CIM 2026 full.');
      }

      throw new Error(message || 'Import ke CIM 2026 full gagal.');
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.success === false) {
      throw new Error(result?.message || 'Import ke CIM 2026 full tidak berjaya.');
    }

    try {
      await callFeederGas('markImported', {
        kodSekolahList: [school.kodSekolah],
      });
    } catch (markError) {
      console.warn('Import berjaya, tetapi gagal tanda status import di Google Sheet:', markError);
    }

    return result;
  },
};
