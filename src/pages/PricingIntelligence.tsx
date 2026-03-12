import type { Period } from '../lib/types';

interface Props {
  period: Period;
}

export function PricingIntelligence({ period }: Props) {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">
        Pricing Intelligence (Τιμολόγηση & Αγορά)
      </h2>
      <div className="card-premium p-8 text-center">
        <p className="text-text-muted">Period: {period.label}</p>
        <p className="text-sm text-text-muted mt-2">
          Cross-filter market analysis (8 dimensions), active/closed modes. Built in Cycle G.
        </p>
      </div>
    </div>
  );
}
