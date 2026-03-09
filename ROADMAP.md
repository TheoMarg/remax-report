# Roadmap: Features προς Ενσωμάτωση

> Ημερομηνία: 2026-03-09
> Βάση: GAP_ANALYSIS.md (18 features) + FEATURE_18.md

---

## Κατάσταση Features

| # | Feature | Status | Σημειώσεις |
|---|---------|--------|------------|
| **1** | 360° Drill-Down Modals | **Ολοκληρωμένο** | Agent360 + Property360 modals, navigation arrows, timeline, price history, κλεισίματα, χαρτοφυλάκιο, υποδείξεις, targets |
| **2** | Targets & Achievement Tracking | **Προς ενσωμάτωση** | Target bars υπάρχουν στο Agent360. Λείπει dedicated σελίδα targets, team targets, ιστορικό στόχων |
| 3 | Alert System | Backlog | |
| 4 | Profitability / P&L Dashboard | Backlog | |
| 5 | Weekly Accountability / Morning Brief | Μερικώς (CRM vs ACC σελίδα) | |
| 6 | Activity Heatmap | Backlog | |
| **7** | Forecasting | **Προς ενσωμάτωση** | Trend-based forecasting, pipeline velocity, revenue projections |
| **8** | Deeper Property Management | **Προς ενσωμάτωση** | Exclusives portfolio υπάρχει. Λείπει rescue pipeline, deposit management, exclusive renewals |
| 9 | Commission Calculator | Backlog | |
| 10 | Global Search / Command Palette | Ολοκληρωμένο | Cmd+K, agents + properties search |
| 11 | Sidebar Navigation | Backlog | |
| 12 | Dark Mode | Backlog | |
| 13 | Toast Notifications | Backlog | |
| **14** | Richer Chart Types | **Προς ενσωμάτωση** | ComposedChart, Bar, Line, Pie υπάρχουν. Λείπουν heatmap charts, scatter plots, gauge charts |
| **15** | Market Report (Larissa Report) | **Προς ενσωμάτωση** | Αναφορά αγοράς ανά περιοχή/office — DOM benchmarks, absorption rates, τιμές/τμ |
| **16** | Comprehensive Statistics Engine | **Προς ενσωμάτωση** | Βασικά KPIs υπάρχουν. Λείπουν advanced stats: median, percentiles, σύγκριση περιόδων, agent scoring |
| **17** | Real Property Lifecycle Analytics | **Προς ενσωμάτωση** | Stage durations + timeline υπάρχουν. Λείπουν conversion funnels ανά τύπο, cohort analysis, price elasticity |
| **18** | Portfolio Quality & Marketability | **Προς ενσωμάτωση** | Marketability scoring ανά subcategory, portfolio quality assessment ανά agent/office |

---

## Πλάνο Υλοποίησης

### Φάση 1: Ολοκλήρωση βάσης (Features 1, 8, 17)

**Feature 1** — Ολοκληρωμένο.

**Feature 8 — Deeper Property Management**
- [ ] Rescue pipeline: ακίνητα σε κίνδυνο (υψηλό DOM, χωρίς υποδείξεις, λήξη αποκλειστικής)
- [ ] Deposit management: dashboard προκαταβολών, conversion deposit → closing
- [ ] Exclusive renewals: ειδοποιήσεις λήξης, ιστορικό ανανεώσεων

**Feature 17 — Real Property Lifecycle Analytics (επέκταση)**
- [ ] Conversion rates ανά στάδιο ανά subcategory
- [ ] Cohort analysis: ακίνητα που μπήκαν τον ίδιο μήνα
- [ ] Price change analytics: μέση μείωση τιμής πριν το κλείσιμο, price elasticity

### Φάση 2: Intelligence & Reporting (Features 2, 7, 15, 16)

**Feature 2 — Targets & Achievement Tracking**
- [ ] Dedicated σελίδα στόχων (ετήσιοι + μηνιαίοι)
- [ ] Team-level targets
- [ ] Ιστορικό επίτευξης στόχων (trend ανά μήνα)
- [ ] Achievement badges / visual indicators

**Feature 7 — Forecasting**
- [ ] Trend-based projection (YTD extrapolation)
- [ ] Pipeline velocity: μέσος χρόνος deposit → closing
- [ ] Revenue forecast βάσει pipeline (deposits + exclusives)
- [ ] Seasonality adjustment

**Feature 15 — Market Report**
- [ ] DOM benchmarks ανά subcategory ανά office
- [ ] Absorption rate (κλεισίματα / ενεργά ακίνητα ανά μήνα)
- [ ] Τιμή/τμ analysis ανά περιοχή + τύπο
- [ ] Supply vs demand indicators
- [ ] Exportable PDF report

**Feature 16 — Comprehensive Statistics Engine**
- [ ] Median + percentiles (όχι μόνο μέσος όρος)
- [ ] Period-over-period σύγκριση (YoY, MoM)
- [ ] Agent scoring / ranking composite metric
- [ ] Office-level aggregations + benchmarking

### Φάση 3: Visualization & UX (Features 14, 18)

**Feature 14 — Richer Chart Types**
- [ ] Heatmap chart (δραστηριότητα ανά μέρα/ώρα)
- [ ] Scatter plot (τιμή vs DOM, εμβαδό vs τιμή)
- [ ] Gauge charts (target achievement)
- [ ] Sparklines σε tables

**Feature 18 — Portfolio Quality & Marketability**
- [ ] Marketability score ανά subcategory (βάσει DOM, absorption, price changes)
- [ ] Portfolio quality score ανά agent
- [ ] Red flags: ακίνητα >2x μέσο DOM, πολλές μειώσεις
- [ ] Office-level portfolio health dashboard

---

## Πρόσφατες Διορθώσεις (2026-03-09)

- **v_valid_closings**: Αποκλεισμός ακινήτων με "Έκλεισε από τον πελάτη" μετά το "Έκλεισε από εμάς" (12 ακίνητα, π.χ. 6414)
- **Price changes**: Smart filtering — sales (×1000) vs rentals (actual EUR), auto-detect scale, 3,667 events αντί 50
- **Offers KPI**: Σύνδεση v_monthly_offers στο v_combined_metrics
- **Portfolio**: Χαρτοφυλάκιο Ακινήτων βάσει ενεργών αποκλειστικών (αντί ενεργών ακινήτων)
- **Teams**: Αθροιστικό portfolio μελών ομάδας

---

## Στατιστικά Δεδομένων

- Valid closings (Έκλεισε από εμάς): **1,095** unique properties
- Closings με προκαταβολή: **319 (29.1%)**
- Closings χωρίς προκαταβολή: **776 (70.9%)**
- Price change events (μετά smart filtering): **3,667**
