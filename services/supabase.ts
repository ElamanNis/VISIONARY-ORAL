import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SavedProject } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function fetchProjects(): Promise<SavedProject[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) {
    console.warn('Supabase fetchProjects error', error);
    return [];
  }
  return (data || []) as unknown as SavedProject[];
}

export async function saveProject(project: SavedProject): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('projects').insert(project as any);
  if (error) console.warn('Supabase saveProject error', error);
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) console.warn('Supabase deleteProject error', error);
}
