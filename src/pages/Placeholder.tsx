interface Props {
  title: string;
  cycle: number;
}

export function Placeholder({ title, cycle }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#0C1E3C] mb-4">{title}</h2>
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 mb-3 rounded-full bg-[#F7F6F3] flex items-center justify-center text-2xl text-[#8A94A0]">
          &hellip;
        </div>
        <p className="text-sm font-semibold text-[#0C1E3C] mb-1">Σε ανάπτυξη</p>
        <p className="text-xs text-[#8A94A0]">
          Η σελίδα αυτή θα είναι διαθέσιμη στο Cycle {cycle}.
        </p>
      </div>
    </div>
  );
}
