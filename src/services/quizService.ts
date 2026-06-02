import { supabase } from '../lib/supabaseClient';

export const quizService = {
  async validateAccessCode(accessCode: string) {
    const { data, error } = await supabase.rpc('validate_access_code', { input_access_code: accessCode });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Tiada respon dari server');
    return data[0];
  },

  async startQuiz(accessCode: string) {
    const { data, error } = await supabase.rpc('start_quiz', { input_access_code: accessCode });
    if (error) throw new Error(error.message);
    return data[0];
  },

  async getQuestions(accessCode: string) {
    const { data, error } = await supabase.rpc('get_quiz_questions', { input_access_code: accessCode });
    if (error) throw new Error(error.message);
    return data;
  },

  async submitQuiz(accessCode: string, answers: { question_id: string; selected_option_index: number }[]) {
    const { data, error } = await supabase.rpc('submit_quiz', { 
      input_access_code: accessCode, 
      answers: answers 
    });
    if (error) throw new Error(error.message);
    return data[0];
  },

  async getLeaderboard() {
    const { data, error } = await supabase.rpc('get_leaderboard');
    if (error) throw new Error(error.message);
    return data;
  },

  async checkCertificate(icNumber: string) {
    const { data, error } = await supabase.rpc('check_certificate', { input_ic_number: icNumber });
    if (error) throw new Error(error.message);
    return data[0] || null;
  },

  async checkCertificateV2(searchType: string, value: string) {
    const { data, error } = await supabase.rpc('check_certificate_v2', { 
      input_search_type: searchType, 
      input_value: value 
    });
    if (error) throw new Error(error.message);
    return data[0] || null;
  },

  async getPublicTop5() {
    try {
      const { data, error } = await supabase.rpc('get_public_top5');
      if (error) {
        console.error('getPublicTop5 error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('getPublicTop5 exception:', e);
      return [];
    }
  },

  async adminGetCertificateStatus() {
    const { data, error } = await supabase.rpc('admin_get_certificate_status');
    if (error) throw new Error(error.message);
    return data[0] || null;
  },

  async releaseCertificates() {
    const { data, error } = await supabase.rpc('release_certificates');
    if (error) throw new Error(error.message);
    return data;
  }
};
