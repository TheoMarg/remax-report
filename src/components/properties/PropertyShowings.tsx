import { useState } from 'react';
import type { Showing } from '../../lib/types';
import { formatDateEL } from '../../lib/propertyMetrics';

interface Props {
  showings: Showing[];
}

export function PropertyShowings({ showings }: Props) {
  const [open, setOpen] = useState(false);

  if (showings.length === 0) {
    return (
      <p className="text-xs text-[#8A94A0] italic">
        Δεν υπάρχουν υποδείξεις
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-[#1B5299] hover:underline flex items-center gap-1"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>
          ▸
        </span>
        Υποδείξεις ({showings.length})
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#8A94A0] border-b border-[#DDD8D0]">
                <th className="pb-1 pr-4 font-medium">Ημ/νία</th>
                <th className="pb-1 pr-4 font-medium">Πελάτης</th>
                <th className="pb-1 font-medium">Υπεύθυνος</th>
              </tr>
            </thead>
            <tbody>
              {showings.map(s => (
                <tr key={s.id} className="border-b border-[#F7F6F3]">
                  <td className="py-1 pr-4 tabular-nums text-[#3A4550]">
                    {formatDateEL(s.showing_date)}
                  </td>
                  <td className="py-1 pr-4 text-[#0C1E3C]">
                    {s.client_name || '—'}
                  </td>
                  <td className="py-1 text-[#3A4550]">
                    {s.manager_name || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
