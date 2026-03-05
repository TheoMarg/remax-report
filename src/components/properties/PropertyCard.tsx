import type { PropertyCardData } from '../../lib/types';
import { formatDateEL } from '../../lib/propertyMetrics';
import { PropertyTimeline } from './PropertyTimeline';
import { PropertyShowings } from './PropertyShowings';
import { AgentLink } from '../ui/AgentLink';
import { PropertyLink } from '../ui/PropertyLink';

interface Props {
  card: PropertyCardData;
  siblingPropertyIds?: string[];
}

export function PropertyCard({ card, siblingPropertyIds }: Props) {
  const { closing, agentName, events, showings, stages, totalDaysToClose, listToCloseRatio } = card;
  const prop = closing.properties;

  return (
    <div className="card-premium border-l-4 border-l-brand-green p-4 space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-text-primary">
              {closing.property_id ? (
                <PropertyLink propertyId={closing.property_id} code={closing.property_code || closing.property_id} className="text-sm font-bold" siblingIds={siblingPropertyIds} />
              ) : (
                closing.property_code || '—'
              )}
            </h4>
            {prop.subcategory && (
              <span className="text-[10px] bg-surface border border-border-default rounded-lg px-1.5 py-0.5 text-text-secondary">
                {prop.subcategory}
              </span>
            )}
            {prop.is_exclusive && (
              <span className="text-[10px] bg-brand-teal/10 text-brand-teal font-semibold rounded-lg px-1.5 py-0.5">
                Αποκλ.
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {[prop.address, prop.area].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
        {/* Price info */}
        <div className="text-right shrink-0">
          {closing.price != null && (
            <p className="text-sm font-bold text-text-primary">
              {closing.price.toLocaleString('el-GR')} €
            </p>
          )}
          {prop.price != null && closing.price !== prop.price && (
            <p className="text-[10px] text-text-muted">
              Τιμή list: {prop.price.toLocaleString('el-GR')} €
            </p>
          )}
          {listToCloseRatio != null && (
            <p className="text-[10px] text-text-muted tabular-nums">
              Ratio: {listToCloseRatio}%
            </p>
          )}
        </div>
      </div>

      {/* Details row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span>
          <span className="text-text-muted">Σύμβουλος:</span>{' '}
          {card.agentId ? (
            <AgentLink agentId={card.agentId} name={agentName} className="font-medium" />
          ) : (
            <span className="font-medium">{agentName}</span>
          )}
        </span>
        <span>
          <span className="text-text-muted">Κλείσιμο:</span>{' '}
          <span className="font-medium tabular-nums">{formatDateEL(closing.closing_date)}</span>
        </span>
        {closing.closing_type && (
          <span>
            <span className="text-text-muted">Τύπος:</span>{' '}
            <span className="font-medium">{closing.closing_type}</span>
          </span>
        )}
        {totalDaysToClose != null && (
          <span className="text-brand-orange font-semibold">
            {totalDaysToClose} ημέρες
          </span>
        )}
      </div>

      {/* Timeline */}
      <PropertyTimeline events={events} stages={stages} />

      {/* Showings */}
      <PropertyShowings showings={showings} />
    </div>
  );
}
