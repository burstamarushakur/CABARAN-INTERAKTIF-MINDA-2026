-- SQL Patch: Tambah Kawalan Pendaftaran (Buka/Tutup Pendaftaran & Tarikh Tutup Auto)
-- Tarikh: 2026-06-04
-- Sasaran: Supabase SQL Editor
--
-- PENTING: Jalankan skrip ini dalam Supabase SQL Editor anda untuk mengaktifkan jadual 'app_settings',
-- polisi RLS, fungsi RPC pub/sub, dan pemicu keselamatan (trigger) pada pangkalan data sebelum
-- menyambungkan kemas kini aplikasi di frontend.

-- ==========================================
-- 1. JADUAL APP_SETTINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Mengaktifkan RLS (Row Level Security)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Gugurkan polisi lama jika wujud untuk mengelakkan ralat penamaan
DROP POLICY IF EXISTS "Sesiapa sahaja boleh baca app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Hanya admin boleh kemas kini app_settings" ON public.app_settings;

-- Polisi RLS: Sesiapa sahaja (public/anon) dibenarkan untuk MEMBACA (SELECT)
CREATE POLICY "Sesiapa sahaja boleh baca app_settings" 
    ON public.app_settings FOR SELECT 
    USING (true);

-- Polisi RLS: Hanya Admin Berdaftar & Authenticated dibenarkan untuk MENGEMAS KINI (ALL)
CREATE POLICY "Hanya admin boleh kemas kini app_settings" 
    ON public.app_settings FOR ALL 
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE email = auth.jwt()->>'email'
        )
    );

-- ==========================================
-- 2. DATA UTAMA / DEFAULT VALUE
-- ==========================================
INSERT INTO public.app_settings (key, value)
VALUES (
    'registration_control',
    '{"mode": "auto", "deadline": "2026-06-19T18:00:00+08:00"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 3. FUNGSI RPC: get_registration_settings_public()
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_registration_settings_public()
RETURNS TABLE (
    mode text,
    deadline text,
    is_open boolean,
    status_label text,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_setting jsonb;
    v_mode text;
    v_deadline timestamptz;
    v_is_open boolean;
    v_status_label text;
    v_message text;
BEGIN
    -- Ambil tetapan pendaftaran daripada jadual
    SELECT value INTO v_setting FROM public.app_settings WHERE key = 'registration_control';
    
    -- Nilai standard sandaran (fallback) sekiranya rekod tiada
    IF v_setting IS NULL THEN
        v_setting := '{"mode": "auto", "deadline": "2026-06-19T18:00:00+08:00"}'::jsonb;
    END IF;

    v_mode := v_setting->>'mode';
    v_deadline := (v_setting->>'deadline')::timestamptz;

    -- Semakan Logik Mengikut Mode
    IF v_mode = 'open' THEN
        v_is_open := true;
        v_status_label := 'DIBUKA MANUAL';
        v_message := 'Pendaftaran dibuka secara manual oleh pihak penganjur.';
    ELSIF v_mode = 'closed' THEN
        v_is_open := false;
        v_status_label := 'DITUTUP MANUAL';
        v_message := 'Pendaftaran telah ditutup oleh pihak penganjur.';
    ELSE
        -- Default Mode: auto
        v_status_label := 'AUTO';
        IF NOW() <= v_deadline THEN
            v_is_open := true;
            v_message := 'Pendaftaran dibuka (Mod Auto). Tarikh akhir: 19 Jun 2026 jam 1800.';
        ELSE
            v_is_open := false;
            v_message := 'Pendaftaran telah ditutup secara automatik pada 19 Jun 2026 jam 1800.';
        END IF;
    END IF;

    RETURN QUERY SELECT 
        v_mode, 
        v_setting->>'deadline', 
        v_is_open, 
        v_status_label, 
        v_message;
END;
$$;

-- ==========================================
-- 4. FUNGSI RPC: admin_update_registration_mode(input_mode text)
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_update_registration_mode(input_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_email text;
    v_is_admin boolean;
    v_current_settings jsonb;
BEGIN
    -- 1. Pengesahan identiti pengguna semasa (authenticated user session)
    v_current_user_email := auth.jwt()->>'email';
    
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users WHERE email = v_current_user_email
    ) INTO v_is_admin;

    IF NOT v_is_admin OR v_current_user_email IS NULL THEN
        RAISE EXCEPTION 'Akses tidak dibenarkan. Anda bukan pentadbir sistem (Admin) yang sah.';
    END IF;

    -- 2. Pengesahan input_mode yang diterima
    IF input_mode NOT IN ('auto', 'open', 'closed') THEN
        RAISE EXCEPTION 'Mod tidak sah. Pilihan yang dibenarkan: auto, open, closed.';
    END IF;

    -- 3. Ambil data konfigurasi terkini
    SELECT value INTO v_current_settings FROM public.app_settings WHERE key = 'registration_control';
    IF v_current_settings IS NULL THEN
        v_current_settings := '{"mode": "auto", "deadline": "2026-06-19T18:00:00+08:00"}'::jsonb;
    END IF;

    -- 4. Kemas kini parameter mod
    v_current_settings := jsonb_set(v_current_settings, '{mode}', to_jsonb(input_mode));

    -- 5. Simpan rekod kemas kini
    INSERT INTO public.app_settings (key, value, updated_at)
    VALUES ('registration_control', v_current_settings, NOW())
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, updated_at = NOW();

    RETURN v_current_settings;
END;
$$;

-- ==========================================
-- 5. PERTAHANAN KESELAMATAN DB: trg_check_registration_status
-- ==========================================
CREATE OR REPLACE FUNCTION public.check_registration_status_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mode text;
    v_deadline timestamptz;
    v_is_open boolean;
    v_setting jsonb;
BEGIN
    -- Semak tetapan pendaftaran
    SELECT value INTO v_setting FROM public.app_settings WHERE key = 'registration_control';
    IF v_setting IS NULL THEN
        v_setting := '{"mode": "auto", "deadline": "2026-06-19T18:00:00+08:00"}'::jsonb;
    END IF;

    v_mode := v_setting->>'mode';
    v_deadline := (v_setting->>'deadline')::timestamptz;

    -- Analisis Status
    IF v_mode = 'open' THEN
        v_is_open := true;
    ELSIF v_mode = 'closed' THEN
        v_is_open := false;
    ELSE
        IF NOW() <= v_deadline THEN
            v_is_open := true;
        ELSE
            v_is_open := false;
        END IF;
    END IF;

    -- Sekat permohonan sekiranya pendaftaran sudah DITUTUP
    IF NOT v_is_open THEN
        RAISE EXCEPTION 'Pendaftaran telah ditutup.';
    END IF;

    RETURN NEW;
END;
$$;

-- Daftar Pemicu (Trigger) pada jadual registrations
DROP TRIGGER IF EXISTS trg_check_registration_status ON public.registrations;
CREATE TRIGGER trg_check_registration_status
    BEFORE INSERT ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.check_registration_status_before_insert();
