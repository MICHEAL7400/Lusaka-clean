import { supabase } from '../lib/supabase';

export const authService = {
  login: async (credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    
    if (error) throw error;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    return {
      success: true,
      user: {
        ...profile,
        email: data.user.email
      },
      token: data.session.access_token
    };
  },

  register: async (userData) => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          role: userData.role || 'resident',
          zone: userData.zone,
          phone: userData.phone
        }
      }
    });
    
    if (error) throw error;
    
    return {
      success: true,
      user: data.user,
      token: data.session?.access_token
    };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (error) throw error;
    return { success: true };
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return profile;
  }
};