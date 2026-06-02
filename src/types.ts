export interface QuizSession {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_index: number;
  option_text: string;
}

export interface Question {
  id: string;
  quiz_session_id: string;
  question_no: number;
  category: string;
  text: string;
  media_type?: 'image' | 'video' | null;
  media_url?: string | null;
  media_caption?: string | null;
  options?: QuestionOption[];
}

export interface Registration {
  id: string;
  teacher_name: string;
  teacher_phone: string;
  teacher_email: string;
  school_name: string;
  school_code: string;
  ppd: string;
  state: string;
  is_paid: boolean;
  payment_ref: string | null;
  registration_date: string;
  created_at: string;
}

export interface Student {
  id: string;
  registration_id: string | null;
  name: string;
  ic_number: string;
  access_code: string;
  access_status: 'pending' | 'active' | 'blocked';
  is_completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  time_taken_seconds: number | null;
  created_at: string;
}

export interface AttemptAnswer {
  id: string;
  student_id: string;
  question_id: string;
  selected_option_index: number;
  answered_at: string;
}

export interface AdminDashboardStats {
  total_schools: number;
  total_students: number;
  total_completed: number;
  total_pending: number;
}
