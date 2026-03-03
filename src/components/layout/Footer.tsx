import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function Footer() {
  const { data: lastSync } = useQuery({
    queryKey: ['last-sync'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sync_log')
        .select('ended_at, status')
        .eq('status', 'success')
        .order('ended_at', { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
    staleTime: 1000 * 60 * 60,
  });

  const syncDate = lastSync?.ended_at
    ? new Date(lastSync.ended_at).toLocaleDateString('el-GR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <footer className="bg-white border-t border-[#DDD8D0] px-6 py-2 text-xs text-[#6B7280] flex justify-between">
      <span>
        Τελευταίος συγχρονισμός: {syncDate ?? 'Μη διαθέσιμο'}
      </span>
      <span>
        RE/MAX Delta Ktima &middot; Εμπιστευτικό
      </span>
    </footer>
  );
}
