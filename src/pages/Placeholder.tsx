interface Props {
  title: string;
  cycle: number;
}

export function Placeholder({ title, cycle }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#0C1E3C] mb-4">{title}</h2>
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-6">
        <p className="text-[#8A94A0]">
          This page will be built in Cycle {cycle}.
        </p>
      </div>
    </div>
  );
}
