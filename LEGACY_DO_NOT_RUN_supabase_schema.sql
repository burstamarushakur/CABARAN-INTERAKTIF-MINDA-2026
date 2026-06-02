-- ====================================================================
-- ⚠️ AMARAN: DIALANG SAMA SEKALI MEMASANG (RUN) FAIL INI DI HUJUNG KIRI/KANAN PRODUCTION (LIVE)!
-- ⚠️ CAUTION: DO NOT RUN THIS FILE ON PRODUCTION.
-- ====================================================================
-- Fail ini adalah rujukan legasi (legacy reference) sahaja.
-- Pengurusan pangkalan data web pengeluaran (production database) telah dipatch
-- secara manual berperingkat melalui Supabase SQL Editor.
-- Menjalankan fail ini secara penuh boleh merosakkan jadual, memadam data murid,
-- me-reset markah sedia ada, atau mematikan fungsi integrasi penting seperti
-- kawalan sijil, senarai anugerah, atau sistem pagination baharu.
-- Sila rujuk fail 'DATABASE_SETUP_README.md' untuk panduan konfigurasi.
-- ====================================================================

-- Supabase Schema for CABARAN INTERAKTIF MINDA TAHUN 2026 (KUIZ SAHAJA)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing tables/functions if necessary
DROP FUNCTION IF EXISTS public.admin_get_registrations();
DROP FUNCTION IF EXISTS public.admin_get_dashboard();
DROP FUNCTION IF EXISTS public.admin_get_quiz_results();
DROP FUNCTION IF EXISTS public.check_certificate(text);
DROP FUNCTION IF EXISTS public.get_leaderboard();
DROP FUNCTION IF EXISTS public.submit_quiz(text, jsonb);
DROP FUNCTION IF EXISTS public.get_quiz_questions(text);
DROP FUNCTION IF EXISTS public.start_quiz(text);
DROP FUNCTION IF EXISTS public.validate_access_code(text);

-- Tables

CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
    question_no INT NOT NULL,
    category TEXT NOT NULL,
    text TEXT NOT NULL,
    correct_option_index INT NOT NULL,
    media_type TEXT,
    media_url TEXT,
    media_caption TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure media columns exist for migration of existing tables
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS media_caption TEXT;

CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    option_index INT NOT NULL,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: registrations and students might exist already or be created by the Pendaftaran app
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_name TEXT NOT NULL,
    teacher_phone TEXT NOT NULL,
    teacher_email TEXT NOT NULL,
    school_name TEXT NOT NULL,
    school_code TEXT NOT NULL,
    ppd TEXT NOT NULL,
    state TEXT NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    payment_ref TEXT,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ic_number TEXT NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    access_status TEXT DEFAULT 'pending', -- pending, active, blocked
    is_completed BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    score INT,
    time_taken_seconds INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_index INT,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns match the requirements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='access_status') THEN
        ALTER TABLE public.students ADD COLUMN access_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_access_code ON public.students(access_code);
CREATE INDEX IF NOT EXISTS idx_students_ic_number ON public.students(ic_number);
CREATE INDEX IF NOT EXISTS idx_students_completed_at ON public.students(completed_at);
CREATE INDEX IF NOT EXISTS idx_students_score ON public.students(score);

-- Enable RLS
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public insert registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow public insert students" ON public.students;
DROP POLICY IF EXISTS "Admin read all quiz_sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Admin read all questions" ON public.questions;
DROP POLICY IF EXISTS "Admin read all question_options" ON public.question_options;
DROP POLICY IF EXISTS "Admin read all registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admin read all students" ON public.students;
DROP POLICY IF EXISTS "Admin read all attempt_answers" ON public.attempt_answers;
DROP POLICY IF EXISTS "Admin read self" ON public.admin_users;

-- Standard accessible read policies for admin and RPC logic
CREATE POLICY "Admin read all quiz_sessions" ON public.quiz_sessions FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "Admin read all questions" ON public.questions FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "Admin read all question_options" ON public.question_options FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "Admin read all registrations" ON public.registrations FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "Admin read all students" ON public.students FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "Admin read all attempt_answers" ON public.attempt_answers FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.admin_users));
CREATE POLICY "Admin read self" ON public.admin_users FOR SELECT TO authenticated USING (auth.uid() = id);

-- Public allow RLS reading for quiz elements by anonymous users since actual session controls are handled safely via SQL function
CREATE POLICY "Anonymous read active sessions" ON public.quiz_sessions FOR SELECT TO anonUSING (is_active = true);


-- RPC Functions

-- 1. validate_access_code
CREATE OR REPLACE FUNCTION public.validate_access_code(input_access_code text)
RETURNS TABLE (
    status text,
    student_id uuid,
    student_name text,
    school_name text,
    is_completed boolean,
    started_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_session RECORD;
    v_status text;
BEGIN
    SELECT s.id, s.name, COALESCE(r.school_name, 'Persendirian'::text) as school_name, s.is_completed, s.started_at, s.access_status 
    INTO v_student
    FROM public.students s
    LEFT JOIN public.registrations r ON s.registration_id = r.id
    WHERE s.access_code = input_access_code LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'INVALID'::text, NULL::uuid, NULL::text, NULL::text, NULL::boolean, NULL::timestamptz;
        RETURN;
    END IF;

    -- If access_status is not 'active', return 'NOT_ACTIVE'
    IF v_student.access_status != 'active' THEN
        RETURN QUERY SELECT 'NOT_ACTIVE'::text, v_student.id, v_student.name, v_student.school_name, v_student.is_completed, v_student.started_at;
        RETURN;
    END IF;

    -- If the student has completed answering
    IF v_student.is_completed THEN
        RETURN QUERY SELECT 'COMPLETED'::text, v_student.id, v_student.name, v_student.school_name, v_student.is_completed, v_student.started_at;
        RETURN;
    END IF;

    -- Find active quiz session
    SELECT * INTO v_session FROM public.quiz_sessions WHERE is_active = true LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'NO_ACTIVE_SESSION'::text, v_student.id, v_student.name, v_student.school_name, v_student.is_completed, v_student.started_at;
        RETURN;
    END IF;

    -- Compare actual timestamps
    IF NOW() < v_session.start_at THEN
        v_status := 'NOT_STARTED';
    ELSIF NOW() > v_session.end_at THEN
        v_status := 'ENDED';
    ELSE
        v_status := 'VALID';
    END IF;

    RETURN QUERY SELECT v_status, v_student.id, v_student.name, v_student.school_name, v_student.is_completed, v_student.started_at;
END;
$$;


-- 2. start_quiz
CREATE OR REPLACE FUNCTION public.start_quiz(input_access_code text)
RETURNS TABLE (
    out_started_at timestamptz,
    out_duration_seconds int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_session public.quiz_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_student FROM public.students WHERE access_code = input_access_code LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid access code'; END IF;
    IF v_student.access_status != 'active' THEN RAISE EXCEPTION 'Access code not active'; END IF;

    SELECT * INTO v_session FROM public.quiz_sessions WHERE is_active = true LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active session'; END IF;

    IF v_student.started_at IS NULL THEN
        UPDATE public.students SET started_at = NOW() WHERE id = v_student.id RETURNING started_at INTO v_student.started_at;
    END IF;

    RETURN QUERY SELECT v_student.started_at, v_session.duration_seconds;
END;
$$;


-- 3. get_quiz_questions
CREATE OR REPLACE FUNCTION public.get_quiz_questions(input_access_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_session public.quiz_sessions%ROWTYPE;
    result json;
BEGIN
    SELECT * INTO v_student FROM public.students WHERE access_code = input_access_code LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid access code'; END IF;
    IF v_student.access_status != 'active' THEN RAISE EXCEPTION 'Access code not active'; END IF;

    SELECT * INTO v_session FROM public.quiz_sessions WHERE is_active = true LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active session'; END IF;

    SELECT json_agg(
        json_build_object(
            'id', q.id,
            'question_no', q.question_no,
            'category', q.category,
            'text', q.text,
            'media_type', q.media_type,
            'media_url', q.media_url,
            'media_caption', q.media_caption,
            'options', (
                SELECT json_agg(json_build_object('id', qo.id, 'option_index', qo.option_index, 'option_text', qo.option_text) ORDER BY qo.option_index)
                FROM public.question_options qo WHERE qo.question_id = q.id
            )
        ) ORDER BY q.question_no
    ) INTO result
    FROM public.questions q
    WHERE q.quiz_session_id = v_session.id AND q.is_active = true;

    RETURN result;
END;
$$;


-- 4. submit_quiz
CREATE OR REPLACE FUNCTION public.submit_quiz(input_access_code text, answers jsonb)
RETURNS TABLE (
    out_score int,
    out_total int,
    out_time_taken int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_session public.quiz_sessions%ROWTYPE;
    v_answer record;
    v_correct int := 0;
    v_total int := 0;
    v_time_taken int := 0;
BEGIN
    SELECT * INTO v_student FROM public.students WHERE access_code = input_access_code LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid access code'; END IF;
    IF v_student.access_status != 'active' THEN RAISE EXCEPTION 'Access code not active'; END IF;
    
    IF v_student.is_completed THEN RAISE EXCEPTION 'Quiz already completed'; END IF;
    IF v_student.started_at IS NULL THEN RAISE EXCEPTION 'Quiz not started'; END IF;

    SELECT * INTO v_session FROM public.quiz_sessions WHERE is_active = true LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active session'; END IF;
    
    -- Relax timestamp window by 15 mins for connectivity safety
    IF NOW() > v_session.end_at + interval '15 minutes' THEN RAISE EXCEPTION 'Quiz session ended'; END IF;
    
    -- Calculate score
    FOR v_answer IN SELECT * FROM jsonb_to_recordset(answers) AS x(question_id uuid, selected_option_index int) LOOP
        DECLARE
            actual_correct int;
        BEGIN
            SELECT correct_option_index INTO actual_correct FROM public.questions WHERE id = v_answer.question_id;
            IF actual_correct IS NOT NULL THEN
                v_total := v_total + 1;
                IF actual_correct = v_answer.selected_option_index THEN
                    v_correct := v_correct + 1;
                END IF;
                -- Save attempt
                INSERT INTO public.attempt_answers (student_id, question_id, selected_option_index) 
                VALUES (v_student.id, v_answer.question_id, v_answer.selected_option_index);
            END IF;
        END;
    END LOOP;
    
    -- If no answers given, still calculate total from questions
    IF v_total = 0 THEN
        SELECT COUNT(*) INTO v_total FROM public.questions WHERE quiz_session_id = v_session.id AND is_active = true;
    END IF;

    v_time_taken := LEAST(EXTRACT(EPOCH FROM (NOW() - v_student.started_at))::int, v_session.duration_seconds);
    IF v_time_taken < 0 THEN
        v_time_taken := 0;
    END IF;

    UPDATE public.students 
    SET score = v_correct, 
        is_completed = true, 
        completed_at = NOW(),
        time_taken_seconds = v_time_taken
    WHERE id = v_student.id;

    RETURN QUERY SELECT v_correct, v_total, v_time_taken;
END;
$$;


-- 5. get_leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
    student_name text,
    school_name text,
    score int,
    time_taken_seconds int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT s.name, COALESCE(r.school_name, 'Persendirian'::text) as school_name, s.score, s.time_taken_seconds
    FROM public.students s
    LEFT JOIN public.registrations r ON s.registration_id = r.id
    WHERE s.is_completed = true AND s.access_status = 'active'
    ORDER BY s.score DESC NULLS LAST, s.time_taken_seconds ASC NULLS LAST
    LIMIT 10;
END;
$$;


-- 6. check_certificate
CREATE OR REPLACE FUNCTION public.check_certificate(input_ic_number text)
RETURNS TABLE (
    student_name text,
    school_name text,
    score int,
    completed_at timestamptz,
    time_taken_seconds int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.name, COALESCE(r.school_name, 'Persendirian'::text) as school_name, s.score, s.completed_at, s.time_taken_seconds
    FROM public.students s
    LEFT JOIN public.registrations r ON s.registration_id = r.id
    WHERE s.ic_number = input_ic_number AND s.is_completed = true AND s.access_status = 'active'
    ORDER BY s.completed_at DESC LIMIT 1;
END;
$$;


-- 7. admin_get_dashboard
CREATE OR REPLACE FUNCTION public.admin_get_dashboard()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT json_build_object(
        'total_schools', (SELECT COUNT(DISTINCT r.school_code) FROM public.students s JOIN public.registrations r ON s.registration_id = r.id WHERE s.access_status = 'active'),
        'total_students', (SELECT COUNT(*) FROM public.students WHERE access_status = 'active'),
        'total_completed', (SELECT COUNT(*) FROM public.students WHERE is_completed = true AND access_status = 'active'),
        'total_pending', (SELECT COUNT(*) FROM public.students WHERE is_completed = false AND access_status = 'active')
    ) INTO result;
    
    RETURN result;
END;
$$;


-- 8. admin_get_quiz_results
CREATE OR REPLACE FUNCTION public.admin_get_quiz_results()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT json_agg(
        json_build_object(
            'student_id', s.id,
            'student_name', s.name,
            'ic_number', s.ic_number,
            'access_code', s.access_code,
            'school_name', COALESCE(r.school_name, 'Persendirian'::text),
            'state', COALESCE(r.state, 'N/A'::text),
            'score', s.score,
            'is_completed', s.is_completed,
            'time_taken_seconds', s.time_taken_seconds,
            'started_at', s.started_at,
            'completed_at', s.completed_at,
            'access_status', s.access_status
        ) ORDER BY s.score DESC NULLS LAST, s.time_taken_seconds ASC NULLS LAST
    ) INTO result
    FROM public.students s
    LEFT JOIN public.registrations r ON s.registration_id = r.id;

    RETURN COALESCE(result, '[]'::json);
END;
$$;


-- Seeding / Creating the active Session
DO $$
DECLARE
    v_session_id UUID;
    v_categories TEXT[] := ARRAY['Bantu Mula', 'Ikatan & Simpulan', 'Perkhemahan & Ikhtiar Hidup', 'Kenegaraan & Sivik', 'Keusahawanan & Khidmat Masyarakat'];
    v_cat TEXT;
    i INT;
    q_no INT := 1;
    v_q_id UUID;
BEGIN
    -- Disable active state on old sessions
    UPDATE public.quiz_sessions SET is_active = false;

    -- Create new CIM 2026 Session scheduled for June 27, 2026
    INSERT INTO public.quiz_sessions (title, start_at, end_at, duration_seconds, is_active)
    VALUES ('CABARAN INTERAKTIF MINDA TAHUN 2026', '2026-06-27 08:00:00+08', '2026-06-27 18:00:00+08', 7200, true)
    RETURNING id INTO v_session_id;

    -- Generate 50 questions
    FOREACH v_cat IN ARRAY v_categories LOOP
        FOR i IN 1..10 LOOP
            INSERT INTO public.questions (quiz_session_id, question_no, category, text, correct_option_index)
            VALUES (v_session_id, q_no, v_cat, 'Soalan ' || q_no || ' berkaitan dengan ' || v_cat || ': Sila pilih jawapan yang terbaik.', 0)
            RETURNING id INTO v_q_id;

            INSERT INTO public.question_options (question_id, option_index, option_text) VALUES 
            (v_q_id, 0, 'Pilihan Jawapan Benar/Terbaik untuk Soalan ' || q_no),
            (v_q_id, 1, 'Pilihan Kadet Alternatif B untuk Soalan ' || q_no),
            (v_q_id, 2, 'Pilihan Kadet Alternatif C untuk Soalan ' || q_no),
            (v_q_id, 3, 'Pilihan Kadet Alternatif D untuk Soalan ' || q_no);

            q_no := q_no + 1;
        END LOOP;
    END LOOP;
END $$;
