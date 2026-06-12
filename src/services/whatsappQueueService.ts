const WHATSAPP_QUEUE_GAS_URL = 'https://script.google.com/macros/s/AKfycbxNwzSWtWtEWAmkmc4yIOGrPEhkXtG2CTSBow7kC0NVD91UIkojZrYMnb0kx-IbDjWj/exec';
const WHATSAPP_QUEUE_TOKEN = 'CIM2026_WHATSAPP_QUEUE_2026';

export interface WhatsAppQueuePayload {
  namaPendaftar: string;
  noTelefon: string;
  noRujukan: string;
  sumber?: string;
}

function isQueueConfigured() {
  return Boolean(
    WHATSAPP_QUEUE_GAS_URL &&
    WHATSAPP_QUEUE_GAS_URL.startsWith('https://script.google.com/macros/s/') &&
    !WHATSAPP_QUEUE_GAS_URL.includes('PASTE_GAS_WEB_APP_URL_HERE')
  );
}

async function postToQueue(action: string, payload: Record<string, unknown>) {
  if (!isQueueConfigured()) {
    console.warn('[WhatsApp Queue] GAS URL belum dikonfigurasi. Approval tidak diganggu.');
    return {
      success: false,
      skipped: true,
      message: 'WhatsApp Queue belum dikonfigurasi.',
    };
  }

  const response = await fetch(WHATSAPP_QUEUE_GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action,
      payload: {
        ...payload,
        token: WHATSAPP_QUEUE_TOKEN,
      },
    }),
  });

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new Error('Respons WhatsApp Queue/GAS tidak sah.');
  }

  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Gagal masukkan data ke WhatsApp Queue.');
  }

  return json;
}

export const whatsappQueueService = {
  async addApprovedRegistration(payload: WhatsAppQueuePayload) {
    if (!payload?.namaPendaftar || !payload?.noTelefon || !payload?.noRujukan) {
      console.warn('[WhatsApp Queue] Data tidak lengkap. Queue diabaikan:', payload);
      return {
        success: false,
        skipped: true,
        message: 'Data queue tidak lengkap.',
      };
    }

    return postToQueue('addApprovedRegistration', {
      namaPendaftar: payload.namaPendaftar,
      noTelefon: payload.noTelefon,
      noRujukan: payload.noRujukan,
      sumber: payload.sumber || 'CIM_ADMIN_APPROVAL',
    });
  },
};
