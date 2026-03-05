const DATA_SOURCES = [
  { metric: 'Καταγραφές', crm: 'CRM Καταγραφές', acc: 'Accountability Report' },
  { metric: 'Νέες Αποκλειστικές', crm: 'CRM Αποκλειστικές Εντολές', acc: 'Accountability Report' },
  { metric: 'Υποδείξεις', crm: 'CRM Υποδείξεις', acc: 'Accountability Report' },
  { metric: 'Προσφορές', crm: 'CRM Προσφορές', acc: 'Accountability Report' },
  { metric: 'Κλεισίματα', crm: 'CRM Κλεισίματα', acc: 'Accountability Report' },
  { metric: 'Συμβολαιοποιήσεις', crm: 'CRM Billing', acc: 'Accountability Report' },
  { metric: 'Νέα Δημοσιευμένα', crm: 'CRM Δημοσιεύσεις', acc: '—' },
];

export function DataSourceTable() {
  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Πηγές Δεδομένων</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-default">
            <th className="text-left py-2 pr-3">Μετρική</th>
            <th className="text-left py-2 pr-3">CRM Πηγή</th>
            <th className="text-left py-2">ACC Πηγή</th>
          </tr>
        </thead>
        <tbody>
          {DATA_SOURCES.map((row, i) => (
            <tr key={i} className="border-b border-border-subtle last:border-0">
              <td className="py-2 pr-3 font-medium text-text-primary">{row.metric}</td>
              <td className="py-2 pr-3 text-text-secondary">{row.crm}</td>
              <td className="py-2 text-text-secondary">{row.acc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
