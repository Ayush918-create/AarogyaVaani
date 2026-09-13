import { supabase } from '@/lib/supabase';

export type PatientProfile = { id: string; full_name: string | null };

/** Creates the signed-in user's patient row if it has not been created yet. */
export async function ensurePatientProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { user: null, patient: null, error: userError ?? new Error('Please sign in again.') };
  }

  const { data, error } = await supabase.rpc('ensure_current_patient');
  return { user, patient: (data as PatientProfile | null) ?? null, error };
}
