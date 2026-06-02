import { supabase } from '../lib/supabaseClient';

export interface StudentRegistrationInput {
  name: string;
  ic_number: string;
}

export interface SubmitRegistrationParams {
  input_state: string;
  input_ppd: string;
  input_school_name: string;
  input_school_code: string;
  input_teacher_name: string;
  input_teacher_phone: string;
  input_teacher_email: string | null;
  input_receipt_path: string;
  input_receipt_file_name: string;
  input_students: StudentRegistrationInput[];
}

export const registrationService = {
  // Upload payment receipt
  async uploadReceipt(schoolCode: string, file: File): Promise<{ path: string; fileName: string }> {
    const timestamp = Date.now();
    // Clean file name to remove non-allowed chars
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `registrations/${schoolCode}/${timestamp}_${safeName}`;

    const { data, error } = await supabase.storage
      .from('payment-receipts')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Receipt upload error:', error);
      throw new Error('Gagal memuat naik slip bayaran.');
    }

    return {
      path,
      fileName: file.name
    };
  },

  // Remove uploaded receipt if submit RPC fails, so storage does not collect orphan files
  async deleteUploadedReceipt(path: string): Promise<void> {
    if (!path) return;

    const { error } = await supabase.storage
      .from('payment-receipts')
      .remove([path]);

    if (error) {
      console.warn('Unable to remove orphan receipt upload:', error);
    }
  },

  // Submit registration through RPC
  async submitRegistration(params: SubmitRegistrationParams) {
    const { data, error } = await supabase.rpc('submit_registration', {
      input_state: params.input_state,
      input_ppd: params.input_ppd,
      input_school_name: params.input_school_name,
      input_school_code: params.input_school_code,
      input_teacher_name: params.input_teacher_name,
      input_teacher_phone: params.input_teacher_phone,
      input_teacher_email: params.input_teacher_email || null,
      input_receipt_path: params.input_receipt_path,
      input_receipt_file_name: params.input_receipt_file_name,
      input_students: params.input_students
    });

    if (error) {
      console.error('RPC submit_registration error:', error);
      const message = String(error.message || '');

      if (message.includes('DUPLICATE_STUDENT_IC') || message.includes('DUPLICATE_STUDENT_IC_ALREADY_REGISTERED')) {
        throw new Error('Terdapat No. MyKid/MyKad murid yang telah didaftarkan sebelum ini. Sila semak semula senarai murid.');
      }

      if (message.includes('PAYMENT_RECEIPT_NOT_FOUND')) {
        throw new Error('Resit pembayaran tidak ditemui. Sila muat naik semula resit pembayaran.');
      }

      if (message.includes('INVALID_STUDENT_DATA')) {
        throw new Error('Maklumat murid tidak lengkap atau No. MyKid/MyKad tidak sah. Sila semak semula.');
      }

      throw new Error('Gagal menghantar pendaftaran. Sila semak maklumat dan cuba semula.');
    }

    // Expecting registration info back (usually returns single row/array with ref No, etc.)
    return Array.isArray(data) ? data[0] : data;
  },

  // Check status
  async checkRegistrationStatus(refNo: string, teacherPhone: string) {
    const cleanedPhone = teacherPhone.replace(/\D/g, '');
    const { data, error } = await supabase.rpc('check_registration_status', {
      input_registration_ref: refNo.trim().toUpperCase(),
      input_teacher_phone: cleanedPhone
    });

    if (error) {
      console.error('RPC check_registration_status error:', error);
      throw new Error(error.message || 'Akses status gagal.');
    }

    return data;
  },

  // ADMIN: Get registrations page
  async adminGetRegistrationsPage(params: {
    input_search: string;
    input_status: string;
    input_limit: number;
    input_offset: number;
  }) {
    // Keep ALL as ALL because the SQL RPC treats ALL as no status filter.
    const statusParam = params.input_status || 'ALL';
    
    const { data, error } = await supabase.rpc('admin_get_registrations_page', {
      input_search: params.input_search,
      input_status: statusParam,
      input_limit: params.input_limit,
      input_offset: params.input_offset
    });

    if (error) {
      console.error('RPC admin_get_registrations_page error:', error);
      throw new Error(error.message || 'Gagal mendapatkan senarai pendaftaran.');
    }

    let rows: any[] = [];
    let total = 0;

    if (data) {
      if (Array.isArray(data)) {
        if (data.length === 1 && data[0] && typeof data[0] === 'object' && ('rows' in data[0] || 'total' in data[0])) {
          rows = data[0].rows || [];
          total = Number(data[0].total ?? data[0].total_count ?? rows.length);
        } else if (data.length > 0) {
          rows = data;
          const first = data[0];
          total = Number(first.total_count ?? first.total ?? first.full_count ?? data.length);
        }
      } else if (typeof data === 'object') {
        const payload = data as any;
        rows = payload.rows || [];
        total = Number(payload.total ?? payload.total_count ?? rows.length);
      }
    }

    return {
      rows,
      total,
      limit: params.input_limit,
      offset: params.input_offset
    };
  },

  // ADMIN: Detail
  async adminGetRegistrationDetail(registrationId: string) {
    const { data, error } = await supabase.rpc('admin_get_registration_detail', {
      input_registration_id: registrationId
    });

    if (error) {
      console.error('RPC admin_get_registration_detail error:', error);
      throw new Error(error.message || 'Gagal memuatkan maklumat pendaftaran.');
    }

    // Returns of this call are usually single object or single element array
    return Array.isArray(data) ? data[0] : data;
  },

  // ADMIN: Get signed URL for receipt
  async getReceiptSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('payment-receipts')
      .createSignedUrl(path, 60 * 15); // 15 minutes validity

    if (error) {
      console.error('Error creating signed URL for receipt:', error);
      throw new Error('Gagal mendapatkan pautan slip bayaran.');
    }

    return data.signedUrl;
  },

  // ADMIN: Approve
  async adminApproveRegistration(registrationId: string, allowEarlyAccess: boolean) {
    const { data, error } = await supabase.rpc('admin_approve_registration', {
      input_registration_id: registrationId,
      input_allow_early_access: allowEarlyAccess
    });

    if (error) {
      console.error('RPC admin_approve_registration error:', error);
      throw new Error(error.message || 'Gagal meluluskan pendaftaran.');
    }

    return data;
  },

  // ADMIN: Reject
  async adminRejectRegistration(registrationId: string, reason: string) {
    const { data, error } = await supabase.rpc('admin_reject_registration', {
      input_registration_id: registrationId,
      input_reason: reason.trim()
    });

    if (error) {
      console.error('RPC admin_reject_registration error:', error);
      throw new Error(error.message || 'Gagal menolak pendaftaran.');
    }

    return data;
  }
};
