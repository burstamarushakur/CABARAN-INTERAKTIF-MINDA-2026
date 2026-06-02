import { supabase } from '../lib/supabaseClient';

export const adminService = {
  async getDashboardStats() {
    const { data, error } = await supabase.rpc('admin_get_dashboard');
    if (error) throw new Error(error.message);
    return data;
  },

  async getQuizResults() {
    const { data, error } = await supabase.rpc('admin_get_quiz_results');
    if (error) throw new Error(error.message);
    return data;
  },

  async getQuizResultsPage(params: {
    input_search: string;
    input_access_status: string;
    input_completion_status: string;
    input_limit: number;
    input_offset: number;
  }) {
    const { data, error } = await supabase.rpc('admin_get_quiz_results_page', params);
    if (error) throw new Error(error.message);

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
        rows = data.rows || [];
        total = Number(data.total ?? data.total_count ?? rows.length);
      }
    }

    return {
      rows,
      total,
      limit: params.input_limit,
      offset: params.input_offset
    };
  },

  async exportQuizResults() {
    const { data, error } = await supabase.rpc('admin_export_quiz_results');
    if (error) throw new Error(error.message);
    return data;
  },

  async getActiveSession() {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async updateSession(id: string, updates: { start_at: string; end_at: string; duration_seconds: number; is_active: boolean }) {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
};
