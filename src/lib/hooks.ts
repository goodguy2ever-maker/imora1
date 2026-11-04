import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/format';
import type { Project, Profile } from '@/lib/types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('projects')
      .select('id,name,description,address,client_name,currency,status,start_date,end_date,created_at')
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(errorMessage(queryError));
    } else {
      setProjects((data as Project[]) ?? []);
      setError('');
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return { projects, loading, error, reload: load };
}

export function useTeam() {
  const [team, setTeam] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id,company_id,role,full_name,position,email,status')
      .order('full_name', { ascending: true });
    if (queryError) {
      setError(errorMessage(queryError));
    } else {
      setTeam((data as Profile[]) ?? []);
      setError('');
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return { team, loading, error, reload: load };
}
