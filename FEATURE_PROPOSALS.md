# Feature Proposals — Αξιολόγηση & Ενσωμάτωση

**Ημερομηνία:** Μάρτιος 2026
**Πηγές:** V3 by Cursor, V3 Copy, ChatGPT Plan, ChatGPT+Gemini Experiment, Claude Experiment, Open Source BI, Remax Ecosystem
**Στόχος:** Αναγνώριση features που δίνουν αξία και μπορούν να ενσωματωθούν αρμονικά στο τρέχον Report Hub

---

## Πώς να διαβάσεις αυτό το έγγραφο

Κάθε feature έχει:
- **Τι είναι** — Σύντομη περιγραφή λειτουργικότητας
- **Γιατί σου δίνει αξία** — Τι πρόβλημα λύνει ή τι ικανότητα προσθέτει
- **Δεδομένα** — Αν τρέχει με τα υπάρχοντα Supabase data ή χρειάζεται νέα
- **Ενσωμάτωση** — Νέο tab, ενσωμάτωση σε υπάρχουσα σελίδα, ή component-level

Τα features είναι χωρισμένα σε 3 tiers:
- **TIER 1** — Τρέχουν 100% με υπάρχοντα δεδομένα, υψηλή αξία
- **TIER 2** — Τρέχουν εν μέρει ή χρειάζονται μικρές προσθήκες δεδομένων
- **TIER 3** — Χρειάζονται νέα data pipelines ή infrastructure

---

## TIER 1 — Υψηλή αξία, πλήρη δεδομένα

---

### 1. Alerts / Rescue Center

**Τι είναι:**
Κεντρικό σύστημα ειδοποιήσεων που σκανάρει αυτόματα τα δεδομένα και εντοπίζει ακίνητα ή agents σε κίνδυνο. Κάθε alert έχει severity (critical / warning / info), τύπο (deadline, anomaly, performance, opportunity), και actionable recommendation. Περιλαμβάνει "Morning Brief" — μια curated λίστα με τα 10 πιο επείγοντα items για τη μέρα.

**Γιατί σου δίνει αξία:**
Σήμερα πρέπει να ψάξεις μόνος σου σε 5-6 σελίδες για να βρεις τι χρειάζεται προσοχή. Το Rescue Center φέρνει τα προβλήματα σε εσένα, πριν γίνουν κρίσιμα. Μετατρέπει το dashboard από παθητικό reporting σε προληπτικό management tool.

**Alert rules που τρέχουν με υπάρχοντα data:**

| Rule | Πηγή δεδομένων | Severity |
|------|----------------|----------|
| Αποκλειστική λήγει σε <15 ημέρες | `v_active_exclusives` (end_date) | Critical |
| Αποκλειστική λήγει σε <30 ημέρες | `v_active_exclusives` (end_date) | Warning |
| Ακίνητο stuck >90 ημέρες χωρίς δραστηριότητα | `v_stuck_alerts` (days_since_activity) | Critical |
| Ακίνητο με 3+ μειώσεις τιμής και 0 υποδείξεις | `v_property_pricing` (price_reduction_count, showing_count) | Warning |
| Agent με 0 καταχωρήσεις τον τρέχοντα μήνα | `v_combined_metrics` (crm_registrations) | Warning |
| Agent CRM vs ACC απόκλιση >50% | `v_combined_metrics` (crm vs acc fields) | Info |
| Ακίνητο >180 ημέρες DOM χωρίς αποκλειστική | `v_property_pricing` (days_on_market, has_active_exclusive) | Warning |
| Ακίνητο τιμή >30% πάνω από benchmark περιοχής | `v_property_pricing` + `v_pricing_benchmark` | Info |

**Ενσωμάτωση:**
**Νέο tab "Alerts"** στο PageNav — full page με:
- Summary strip στο πάνω μέρος (π.χ. "4 Critical · 12 Warning · 8 Info")
- Φίλτρα: severity, type, office, agent
- Expandable cards με property/agent context και recommended action
- Επιπλέον: **Mini alert badge** στο Overview hero section με count κρίσιμων alerts
- Επιπλέον: **Alert count badge** δίπλα στο "Alerts" tab στο PageNav

---

### 2. Closings Dashboard

**Τι είναι:**
Αφιερωμένη σελίδα για ανάλυση κλεισίματος συναλλαγών. Δεν είναι απλά ένας πίνακας closings — είναι πλήρες analytics: KPIs (count, GCI, μέσος χρόνος κλεισίματος, μέσο discount), breakdowns κατά κατηγορία/περιοχή/τύπο, time-series ανά μήνα, sale vs rent comparison, per-office και per-agent stats, top closings πίνακας.

**Γιατί σου δίνει αξία:**
Τα closings είναι το τελικό KPI — revenue. Σήμερα τα βλέπεις σκορπισμένα (GCI στο Overview, rankings στο GCI page, λίστα στο Agent Profile). Μια dedicated σελίδα σου δίνει πλήρη εικόνα: πού κλείνεις (περιοχές), τι κλείνεις (κατηγορίες), πόσο γρήγορα, με τι discount, και trend analysis.

**Δεδομένα — 100% υπάρχουν:**
- `v_valid_closings` — confirmed closings με property details
- `v_closing_pricing` — closing + listing price, eur/sqm, discount, DOM, category
- `v_property_journey` — days_total_journey, price_delta_pct
- `v_combined_metrics` — monthly closing count per agent

**Ενσωμάτωση:**
**Νέο tab "Closings"** — full page με 4 sections:
1. KPI strip (count, GCI, avg discount, avg DOM, avg deal size)
2. Monthly trend chart (closings count + GCI line)
3. Breakdown cards: by category, by area/region, by office, sale vs rent
4. Detailed closings table (sortable, filterable, κλικ → Property 360)

---

### 3. Exclusives Watchlist

**Τι είναι:**
Operational watchlist για ενεργές αποκλειστικές εντολές. Κάθε γραμμή δείχνει: ακίνητο, agent, ημερομηνίες υπογραφής/λήξης, εναπομείνασες ημέρες (countdown), status indicator (πράσινο >60d, κίτρινο 30-60d, κόκκινο <30d, pulse animation <15d). Περιλαμβάνει renewal rate KPI και summary stats.

**Γιατί σου δίνει αξία:**
Οι αποκλειστικές εντολές λήγουν σιωπηλά. Αν δεν παρακολουθείς ενεργά, χάνεις αποκλειστικές χωρίς ανανέωση. Αυτό σημαίνει χαμένη δέσμευση ιδιοκτήτη, χαμένη δυνατότητα marketing, χαμένο revenue. Ένα watchlist με countdown και color-coding κάνει αδύνατο να χαθεί μια λήξη.

**Δεδομένα — 100% υπάρχουν:**
- `v_active_exclusives` — id, agent_id, property_id, sign_date, end_date, days_active, price, area, category
- `exclusives` table — πλήρες ιστορικό (status, owner_name)
- `agents` — canonical_name, office

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Portfolio" section** — νέο tab "Exclusives Watchlist" δίπλα στα Published Properties / Quality. Εναλλακτικά: section μέσα στο Insights page (tab "At-Risk" που ήδη υπάρχει). Μπορεί να τρέξει και στα δύο: summary στο Insights, full list στο Portfolio.

---

### 4. Deal Velocity

**Τι είναι:**
Ανάλυση ταχύτητας διαδρομής ακινήτων μέσα στο pipeline. Μετράει πόσες ημέρες κάνει κατά μέσο όρο κάθε transition: Registration→Exclusive, Exclusive→Showing, Showing→Offer, Offer→Closing. Δείχνει bottlenecks (ποιο stage καθυστερεί), σύγκριση agent vs office vs company average, και trend analysis (βελτιώνεται ή επιδεινώνεται η ταχύτητα;).

**Γιατί σου δίνει αξία:**
Ξέρεις πόσα closings κάνεις, αλλά ξέρεις πόσο γρήγορα τα κάνεις; Αν ο μέσος χρόνος Exclusive→Closing αυξάνεται, σημαίνει ότι η αγορά αργεί ή ο agent δεν πιέζει αρκετά. Αν ένας agent κλείνει σε 45 μέρες ενώ ο μέσος είναι 90, είναι star performer. Η ταχύτητα pipeline = υγεία business.

**Δεδομένα — 100% υπάρχουν:**
- `v_property_journey` — days_reg_to_excl, days_excl_to_offer, days_offer_to_closing, days_excl_to_closing, days_total_journey
- Ήδη computed στη view — δεν χρειάζεται καμία νέα query

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Pipeline" page** — νέο tab "Velocity" δίπλα στα stage tabs. Εναλλακτικά, section στο Insights page. Περιλαμβάνει:
- Avg days bar chart ανά stage (horizontal stacked bar)
- Agent comparison table (agent velocity vs company avg)
- Trend line (μηνιαίος μέσος χρόνος pipeline)
- Bottleneck indicator (ποιο stage έχει τη μεγαλύτερη καθυστέρηση)

---

### 5. Target Pacing

**Τι είναι:**
Real-time σύγκριση ετήσιου στόχου (GPS target) vs πραγματικής πορείας. Δείχνει: % ετήσιου στόχου που έχει επιτευχθεί, ιδανικό % βάσει ημερομηνίας (π.χ. στις 13/3 πρέπει να είσαι στο 20.3%), απόκλιση (ahead/behind), required weekly pace για να πιάσεις τον στόχο μέχρι 31/12. Per agent και per office.

**Γιατί σου δίνει αξία:**
Ο ετήσιος στόχος φαίνεται μακρινός μέχρι τον Οκτώβριο που είναι αργά. Το pacing σου λέει ΤΩΡΑ αν είσαι on track. "Είσαι 3.2% πίσω — χρειάζεσαι €1,200/εβδομάδα αντί €980" είναι actionable insight. Κανένα άλλο metric δεν σου δίνει αυτή την πρόγνωση.

**Δεδομένα — 100% υπάρχουν:**
- `agent_targets` / `targets_annual` — gci_target, registrations_target, exclusives_target, showings_target, offers_target, closings_target
- `v_combined_metrics` — YTD actual values (crm_closings, gci, etc.)
- Σημερινή ημερομηνία → ideal_pct = day_of_year / 365

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Agent Profile" page** — νέο section "Target Pacing" με gauge charts (actual vs ideal vs target). Επίσης:
- **Overview page**: mini pacing strip στο hero section (company-level: "72% of agents on track")
- **Leaderboard page**: νέα στήλη "Pacing" στα rankings (ahead/behind indicator)
- **Reports page**: νέο toggleable section "Target Pacing Summary"

---

### 6. Revenue Forecasting

**Τι είναι:**
Πρόβλεψη GCI 3-6 μηνών μπροστά βάσει ιστορικών δεδομένων. Χρησιμοποιεί πολλαπλές μεθόδους: moving average (τελευταίοι 3 μήνες), linear trend (γραμμική τάση), year-over-year growth (αύξηση σε σχέση με πέρυσι), seasonal pattern (εποχικότητα), ensemble (μέσος όρος μεθόδων). Δείχνει confidence intervals (high/medium/low) και projected vs actual chart.

**Γιατί σου δίνει αξία:**
Αντί να περιμένεις να δεις τα νούμερα στο τέλος του μήνα, βλέπεις πού πάει η τάση. Αν η πρόβλεψη δείχνει πτώση, μπορείς να αντιδράσεις (campaigns, πίεση σε agents, κλπ.). Αν δείχνει αύξηση, μπορείς να πλανάρεις expansion. Δεν χρειάζεται ακρίβεια ρομπότ — αρκεί η κατεύθυνση.

**Δεδομένα — 100% υπάρχουν:**
- `v_combined_metrics` — μηνιαίο GCI ανά agent, ξεκινώντας από αρχές 2025 (12+ μήνες ιστορικό)
- `v_valid_closings` — closing dates + GCI amounts
- `dashboard_history` / `gci_monthly` — παλαιότερο ιστορικό GCI
- Η πρόβλεψη γίνεται client-side σε JS — δεν χρειάζεται backend

**Ενσωμάτωση:**
**Νέο tab "Forecast"** στο PageNav — dedicated page με:
1. Forecast chart (line chart: actual + projected + confidence band)
2. Method comparison table (ποια μέθοδος τι προβλέπει)
3. Per-office forecast breakdown
4. "What-if" slider: αν αυξήσω closings κατά 10%, τι GCI περιμένω;

Εναλλακτικά: ενσωμάτωση ως section στο Reports page (toggleable).

---

### 7. Dark/Light Theme

**Τι είναι:**
Toggle button (sun/moon icon) στο header που αλλάζει ολόκληρο το dashboard μεταξύ light και dark mode. Αποθηκεύει preference σε localStorage. Χρησιμοποιεί τα υπάρχοντα CSS design tokens (--color-surface, --color-text-primary, κλπ.) που ήδη ορίζονται στο theme.

**Γιατί σου δίνει αξία:**
Πρακτικά: αν δουλεύεις βράδυ ή σε σκοτεινό περιβάλλον, το dark mode μειώνει κούραση ματιών. Αισθητικά: δείχνει professional, modern product. Τεχνικά: η υποδομή υπάρχει ήδη (design tokens) — χρειάζεται μόνο ένα δεύτερο set τιμών.

**Δεδομένα:** Δεν χρειάζεται δεδομένα — είναι pure UI feature.

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον header/PageNav** — ένα sun/moon icon button δίπλα στο period selector. Αλλάζει CSS class στο `<html>` element, τα tokens αλλάζουν αυτόματα. Zero impact σε υπάρχοντα components αν τα tokens ρυθμιστούν σωστά.

---

### 8. Global Search

**Τι είναι:**
Search bar στο header του dashboard (Ctrl+K shortcut) που ψάχνει ταυτόχρονα σε agents, ακίνητα, περιοχές. Πληκτρολογείς "Παπαδόπουλος" → βλέπεις agent results + ακίνητα που τον αφορούν. Πληκτρολογείς "Κατερίνη" → βλέπεις office + properties στην περιοχή. Κλικ σε result → ανοίγει 360 modal ή navigates στη σχετική σελίδα.

**Γιατί σου δίνει αξία:**
Αντί να navigateάρεις σε σελίδες και να ψάχνεις σε dropdowns/πίνακες, πηγαίνεις κατευθείαν. Ειδικά χρήσιμο σε meetings: "πες μου γρήγορα τι κάνει ο Ταραντίλης" → Ctrl+K → "Ταρ" → click → Agent 360. 2 δευτερόλεπτα αντί 20.

**Δεδομένα — 100% υπάρχουν:**
- `agents` table — canonical_name, office
- `properties` table — property_code, address, area, agent_id
- Client-side fuzzy search (δεν χρειάζεται Supabase full-text) — τα data είναι ήδη cached στο React Query

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον header** — search icon + expandable search bar στο PageNav. Command palette style (modal overlay) όπως VS Code / Spotlight. Results grouped: "Agents", "Properties", "Closings". Click → Agent360 / Property360 modal ή navigation.

---

### 9. Notification Bell

**Τι είναι:**
Bell icon στο header με badge counter. Κλικ → dropdown με πρόσφατα notifications: "3 αποκλειστικές λήγουν σε <15 ημέρες", "Ο agent Χ δεν έχει καταχώρηση τον τρέχοντα μήνα", "Νέο closing: Διαμέρισμα στη Λάρισα €85,000". Κάθε notification έχει type icon, timestamp, read/unread status.

**Γιατί σου δίνει αξία:**
Συμπλήρωμα του Alerts page — δεν χρειάζεται να πηγαίνεις στο Alerts tab για να δεις αν υπάρχει κάτι επείγον. Το bell σε ειδοποιεί ενώ είσαι σε οποιαδήποτε σελίδα. Σαν ένα "early warning system" που τρέχει πάντα.

**Δεδομένα:** Ίδια με Alerts (#1) — υπολογίζονται client-side. Δεν χρειάζεται Supabase table.

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον PageNav header** — bell icon δίπλα στο theme toggle. Dropdown overlay. Computed κάθε φορά που τα React Query data κάνουν refetch (κάθε 1 ώρα). Κλικ σε notification → navigate στο σχετικό alert/property/agent.

Σημείωση: Εξαρτάται λογικά από Feature #1 (Alerts). Πρέπει να υλοποιηθεί μαζί ή μετά.

---

## TIER 2 — Μεσαία αξία, μικρές προσθήκες δεδομένων

---

### 10. Activity Heatmap

**Τι είναι:**
Visual heatmap grid (agents × εβδομάδες) που δείχνει ένταση δραστηριότητας κάθε agent κάθε εβδομάδα με color intensity. Πράσινο = υψηλή δραστηριότητα, κόκκινο = χαμηλή/μηδενική, γκρι = δεν υπάρχουν δεδομένα. Κλικ σε κελί → breakdown actions (cold calls, meetings, follow-ups, κλπ.).

**Γιατί σου δίνει αξία:**
Βλέπεις patterns: ποιος agent είναι consistently ενεργός, ποιος έχει "σκοτεινές" εβδομάδες (πιθανό burnout ή αδιαφορία), ποιος βελτιώνεται. Σε ένα glance βλέπεις 6 μήνες × 20 agents. Κανένας πίνακας αριθμών δεν δίνει αυτή την εικόνα.

**Δεδομένα — Εν μέρει υπάρχουν:**
- `v_agent_activity` — **υπάρχει** αλλά aggregated ανά μήνα, όχι ανά εβδομάδα
- `accountability_reports` — **υπάρχει** raw data ανά εβδομάδα (report_date, week column)
- Χρειάζεται: ένα νέο view `v_weekly_activity` που groupάρει ανά agent_id + week (εύκολο SQL)
- Εναλλακτικά: τρέχει με μηνιαίο granularity χωρίς αλλαγή (agents × μήνες)

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Accountability" page** — νέο section ή tab "Activity Heatmap" μέσα στη σελίδα (που ήδη αφορά activity tracking). Εναλλακτικά: section στο Insights page.

---

### 11. Churn Risk Analysis

**Τι είναι:**
Scoring model που αξιολογεί πόσο πιθανό είναι ένας agent να φύγει (resign) ή να γίνει ανενεργός. Βασίζεται σε signals: declining monthly registrations, declining showings, χαμηλό accountability submission rate, μεγάλη απόκλιση CRM vs ACC, μειούμενο GCI trend, χαμηλό WPS score. Κάθε agent παίρνει risk score (low/medium/high/critical) με τους λόγους.

**Γιατί σου δίνει αξία:**
Η αποχώρηση ενός agent κοστίζει: χαμένο pipeline, χαμένες σχέσεις πελατών, κόστος recruitment + training αντικαταστάτη. Αν εντοπίσεις τα σημάδια νωρίς (3-6 μήνες πριν), μπορείς να επέμβεις: κίνητρα, support, αλλαγή ομάδας.

**Δεδομένα — Σχεδόν 100% υπάρχουν:**
- `v_combined_metrics` — monthly KPI trend per agent (declining registrations, closings, GCI)
- `v_agent_activity` — activity levels (declining = risk signal)
- `v_combined_metrics` — CRM vs ACC deviation (σύμπτωμα αποδέσμευσης)
- `agents` — start_date (tenure), is_active
- **Δεν υπάρχει:** ιστορικό πραγματικών αποχωρήσεων για training ML model. Αλλά δεν χρειάζεται ML — rule-based scoring αρκεί.

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Insights" page** — νέο tab "Churn Risk" δίπλα στα pricing/seasonality/pipeline/at-risk/cooperation/stuck. Table: agent name, risk score, risk factors, trend arrow, suggested action.

---

### 12. Data Quality Dashboard

**Τι είναι:**
Σελίδα / section που δείχνει την "υγεία" των δεδομένων: πόσα ακίνητα δεν έχουν registration_date (8.7%), πόσες αποκλειστικές δεν συνδέονται με property_id (37%), duplicate detection, missing fields, consistency checks. Overall quality score 0-100. Recommendations: "52 ακίνητα χωρίς περιοχή — εμπλουτίστε τα στο CRM".

**Γιατί σου δίνει αξία:**
"Garbage in, garbage out" — αν τα data δεν είναι σωστά, κανένα chart δεν σημαίνει τίποτα. Ξέρεις ότι 37% exclusives δεν linkάρουν με properties. Πόσα ακίνητα έχουν λάθος τιμή; Πόσα agents δεν κάνουν submit accountability; Αυτό το dashboard κάνει τα "blind spots" visible.

**Δεδομένα — 100% υπάρχουν (computed):**
- `properties` — NULL checks σε registration_date, area, category, price, size_sqm
- `exclusives` — NULL property_id count
- `accountability_reports` — ποιοι agents δεν έχουν submission αυτή τη βδομάδα
- `v_property_journey` — has_registration flag (false = αδυναμία tracking)
- Όλα computed client-side ή με simple COUNT queries

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Settings" page** — νέο tab/section "Data Quality" (visible μόνο σε ops_mgr). Εναλλακτικά: νέο tab στο PageNav αν θεωρείς ότι αξίζει dedicated σελίδα.

---

### 13. YoY / MoM Comparison

**Τι είναι:**
Period-over-period σύγκριση: "Φεβρουάριος 2026 vs Φεβρουάριος 2025" ή "Αυτός ο μήνας vs περασμένος μήνας". Δείχνει % μεταβολή ανά KPI με color coding (πράσινο = αύξηση, κόκκινο = μείωση), comparison charts (side-by-side bars ή overlay lines), και highlight "biggest improvers" / "biggest decliners".

**Γιατί σου δίνει αξία:**
Τα absolute νούμερα δεν λένε πολλά χωρίς context. "48 registrations" — είναι πολλά ή λίγα; Αν πέρυσι ήταν 62, τότε -22% — πρόβλημα. Αν ήταν 35, τότε +37% — εξαιρετικά. Η σύγκριση δίνει context στα νούμερα.

**Δεδομένα — 100% υπάρχουν:**
- `v_combined_metrics` — μηνιαία data από 2025 (12+ μήνες), αρκεί για YoY
- `dashboard_history` / `gci_monthly` — ιστορικό GCI για παλαιότερες περιόδους
- Comparison logic: απλό SQL/JS filtering ανά period_start

**Ενσωμάτωση:**
**Ενσωμάτωση σε υπάρχουσες σελίδες** (δεν χρειάζεται νέο tab):
- **Overview**: KPI cards αποκτούν % change badge (▲12% vs last month)
- **KPI Detail page**: νέο comparison mode toggle (show/hide previous period overlay)
- **Reports page**: νέο toggleable section "Period Comparison"
- **Agent Profile**: YTD comparison vs previous year

---

### 14. Market Reports (Larissa Report)

**Τι είναι:**
Professional-grade PDF αναφορά αγοράς, εμπνευσμένη από Knight Frank / CBRE reports. 8 sections: Executive Summary, Price Analytics (μέσες τιμές, τάσεις, €/τ.μ.), Transaction Volume & Velocity, Rental Market Analysis, Supply & Pipeline Analysis, Comparative Analysis (Λάρισα vs Κατερίνη), Market Outlook, Methodology. Branded design με λογότυπο, charts, και professional layout.

**Γιατί σου δίνει αξία:**
Αυτό δεν είναι internal report — είναι marketing asset. Μπορείς να το δίνεις σε πελάτες, developers, τραπεζίτες. "Ορίστε η ανάλυση αγοράς Λάρισας Q1 2026 από RE/MAX Delta Ktima." Σε τοποθετεί ως market expert, όχι απλά μεσίτη. Κανένα άλλο μεσιτικό γραφείο στη Λάρισα δεν έχει τέτοιο report.

**Δεδομένα — 90% υπάρχουν:**
- `v_closing_pricing` — τιμές κλεισίματος, €/τ.μ., discount, DOM, κατηγορία, περιοχή
- `v_property_pricing` — active inventory pricing
- `v_pricing_benchmark` — benchmarks ανά περιοχή/κατηγορία
- `v_combined_metrics` — volume metrics (registrations, closings, GCI)
- `v_funnel_by_type` — pipeline conversion rates
- **Λείπει:** rental-specific analytics view (ξεχωριστά ενοικίαση KPIs) — μπορεί να φιλτράρει `transaction_type='Ενοικίαση'`

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Reports" page** — νέο section/button "Market Report" ή ξεχωριστό tab. Επιλέγεις office(s) + period → Generate → Preview → Export PDF. Χρησιμοποιεί html2canvas + jsPDF (ήδη στο project) ή dedicated report template.

---

### 15. Evidence Drillthrough

**Τι είναι:**
Κλικ σε οποιοδήποτε KPI αριθμό (π.χ. "48 registrations") → modal popup/drawer δείχνει ακριβώς ποιες 48 εγγραφές τον αποτελούν: property_code, ημερομηνία, agent, περιοχή, κατηγορία. Basically: "Show me the receipts." Κάθε aggregated metric γίνεται drill-downable.

**Γιατί σου δίνει αξία:**
Πόσες φορές είδες ένα νούμερο και σκέφτηκες "αυτό είναι σωστό;". Χωρίς drillthrough, πρέπει να πας στο CRM, να ψάξεις, να φιλτράρεις. Με drillthrough: κλικ → βλέπεις τα raw data → verify σε 3 δευτερόλεπτα. Χτίζει trust στα δεδομένα.

**Δεδομένα — Εν μέρει υπάρχουν:**
- Registrations: `properties` filtered by registration_date στο period
- Exclusives: `exclusives` filtered by sign_date
- Showings: `ypodikseis` filtered by showing_date
- Closings: `v_valid_closings` filtered by closing_date
- GCI: `billing_transactions` filtered by billing_month
- **Χρειάζεται:** νέα hooks που φέρνουν raw records per metric per period (σχετικά απλό)

**Ενσωμάτωση:**
**Ενσωμάτωση σε υπάρχοντα components** — cross-cutting feature:
- Όπου υπάρχει clickable αριθμός (KPI cards, tables, charts) → click → Drillthrough Drawer
- Reusable `<DrilldownDrawer metric="registrations" period={period} agentId={id} />`
- Αρχικά σε: Overview KPI cards, KPI Detail page, Agent Profile YTD grid

---

## TIER 3 — Nice-to-have, χρειάζονται νέα data

---

### 16. Commission Tracking

**Τι είναι:**
Πλήρες lifecycle παρακολούθησης προμηθειών: ποια closings έχουν εκκρεμή πληρωμή, τι % πάει στον agent vs office vs RE/MAX franchise, ποιες προμήθειες είναι overdue, ιστορικό πληρωμών. Statuses: pending → partial → paid / on_hold.

**Γιατί σου δίνει αξία:**
Το GCI σου λέει πόσα χρήματα μπήκαν — δεν σου λέει αν πληρώθηκαν οι agents, πόσα κράτησε το γραφείο, τι πηγαίνει στη RE/MAX International (9%). Για financial management χρειάζεσαι αυτό το breakdown.

**Δεδομένα — Εν μέρει υπάρχουν:**
- `billing_transactions` — property_value, gci, is_rental, office
- `v_valid_closings` — closing_price, gci
- **Δεν υπάρχει:** agent split %, payment status, payment dates, office cost structure
- Χρειάζεται: νέος πίνακας `commission_payments` ή enrichment στο billing_transactions

**Ενσωμάτωση:**
**Νέο tab "Commissions"** (ops_mgr only) ή section στο Reports page. Εναλλακτικά, waterfall chart στο Overview (revenue → agent share → office share → RE/MAX fee → profit).

---

### 17. Profitability / P&L

**Τι είναι:**
Ανάλυση κερδοφορίας: Revenue (GCI) μείον κόστη (μισθοί γραμματείας, ενοίκιο, marketing, RE/MAX fee 9%, κλπ.) = καθαρό κέρδος. Per-office P&L, monthly trend, profit margin tracking. What-if scenario: "τι γίνεται αν προσλάβω 2 agents;".

**Γιατί σου δίνει αξία:**
Revenue ≠ profit. Μπορεί να κάνεις €500K GCI αλλά αν τα κόστη είναι €480K, δεν κερδίζεις. P&L σου δείχνει τη real εικόνα. Ειδικά χρήσιμο για σύγκριση γραφείων (Λάρισα vs Κατερίνη profitability).

**Δεδομένα — Ελάχιστα υπάρχουν:**
- `billing_transactions` / `gci_monthly` — revenue side υπάρχει
- **Δεν υπάρχει:** cost data (μισθοί, ενοίκια, marketing spend, desk fees, κλπ.)
- Χρειάζεται: νέος πίνακας `office_costs` ή `financial_records` + manual data entry ή import από GrowthCFO

**Ενσωμάτωση:**
**Νέο tab "P&L"** (ops_mgr only) — dedicated page. Ή section στο Reports page. Θέλει investment σε data collection πρώτα.

---

### 18. Portfolio Marketability Scoring

**Τι είναι:**
Data-driven βαθμολόγηση εμπορευσιμότητας ανά τύπο ακινήτου (subcategory × transaction_type) βάσει ιστορικών δεδομένων πραγματικής απόδοσης. Κάθε τύπος (π.χ. Διαμέρισμα/Πώληση, Βίλα/Πώληση) παίρνει Marketability Score 0-100 βάσει 5 παραγόντων: absorption rate (ρυθμός απορρόφησης), DOM (ημέρες στην αγορά), conversion rate (published→closing), price stability (% χωρίς μείωση τιμής), withdrawal rate. Στη συνέχεια, κάθε agent αξιολογείται βάσει του mix ακινήτων που έχει: portfolio weighted score, concentration risk (HHI index), red flag count, stale %.

**Διαφορά από υπάρχον PQS:** Το σημερινό PQS σκοράρει agents βάσει γενικών μετρικών (freshness, exclusive ratio, avg DOM). ΔΕΝ λαμβάνει υπόψη τον τύπο ακινήτου. Agent με 10 βίλες (δύσκολη κατηγορία, DOM ~190 ημέρες) βαθμολογείται άδικα χαμηλά vs agent με 10 γκαρσονιέρες (εύκολη κατηγορία, DOM ~18 ημέρες). Το Marketability Scoring διορθώνει αυτό — σκοράρει πρώτα την αγορά, μετά τον agent μέσα στο context της αγοράς.

**Γιατί σου δίνει αξία:**
- Βλέπεις **ποιος τύπος ακινήτου πουλάει/νοικιάζεται πιο γρήγορα** — data-driven, όχι γνώμη
- Σωστή αξιολόγηση agents: αυτός με "βαρύ" portfolio (βίλες, οικόπεδα) δεν πρέπει να κρίνεται όπως αυτός με εύκολα διαμερίσματα
- Εντοπίζεις **red flags**: ακίνητα πάνω από 2× μέσο DOM με 2+ μειώσεις τιμής
- Βλέπεις **concentration risk**: αν ένας agent έχει 80% οικόπεδα, το portfolio του είναι fragile
- Office-level: ποιο γραφείο έχει πιο "υγιές" mix;

**Δεδομένα — 100% υπάρχουν:**
- `v_property_pricing` — subcategory, transaction_type, days_on_market, price_reduction_count, showing_count, has_active_exclusive (7,307 properties)
- `v_closing_pricing` — closing_price, category, subcategory, days_on_market (3,814 closings)
- `v_funnel_by_type` — conversion rates ανά subcategory (ήδη υπάρχει!)
- `v_property_journey` — full lifecycle data
- `properties` — agent_id, price, is_retired
- Scoring logic 100% client-side σε TypeScript — δεν χρειάζεται νέο Supabase view (optional optimization)

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Portfolio" section** — δεν χρειάζεται νέο tab στο PageNav:
- **Portfolio Quality page**: νέο section "Εμπορευσιμότητα ανά Τύπο" πάνω από τους agent scores. Heatmap grid (πώληση × ενοικίαση) + breakdown table (subcategory, listings, closings, conv%, avg DOM, score)
- **Agent Profile page**: στο PQS card, δίπλα στο score, badge "Portfolio Mix: Diversified / Concentrated" + red flag count
- **Property 360 modal**: badge δίπλα στην κατηγορία: "Marketability: 78/100 — Καλή αγορά"
- Zero νέα navigation — εμπλουτίζει τα υπάρχοντα components

---

### 19. Deposits Management

**Τι είναι:**
Dedicated παρακολούθηση προκαταβολών/αρραβώνων: ανοιχτοί deposits, ποσά, αναμενόμενη ημερομηνία κλεισίματος, stuck deposits (>90 ημέρες χωρίς closing), cancelled deposits. Pipeline value visualization.

**Γιατί σου δίνει αξία:**
Ένα deposit σημαίνει "σχεδόν κλείσαμε" — αλλά πολλά deposits δεν οδηγούν σε closing. Tracking τους σου δείχνει: πόσο pipeline value έχεις, ποιοι agents έχουν stuck deposits, τι conversion rate deposit→closing.

**Δεδομένα — Εν μέρει υπάρχουν:**
- `status_changes` — event_type='deposit' (υπάρχει)
- `v_property_journey` — has_offer flag, dt_offer
- **Δεν υπάρχει:** deposit amount, expected closing date, deposit status (open/closed/cancelled)
- Χρειάζεται: νέος πίνακας `deposits` ή enrichment στο status_changes

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Pipeline" page** — νέο tab "Deposits" δίπλα στα stage tabs. Ή section στο Insights page.

---

### 20. Room Booking System

**Τι είναι:**
Calendar-based σύστημα κράτησης αιθουσών (Λάρισα, Κατερίνη). Επιλέγεις αίθουσα, ημερομηνία, ώρα, σκοπό, συμμετέχοντες. Βλέπεις διαθεσιμότητα σε calendar view.

**Γιατί σου δίνει αξία:**
Λειτουργικό εργαλείο — μειώνει conflicts κράτησης αιθουσών. Αλλά ΔΕΝ σχετίζεται με analytics/reporting. Είναι intranet feature, όχι dashboard feature.

**Δεδομένα:** Κανένα — χρειάζεται νέο table `room_bookings` και νέο UI.

**Ενσωμάτωση:**
**Δεν ταιριάζει** με το Report Hub dashboard. Αυτό ανήκει σε intranet/team portal (π.χ. Delta-Ktima Modern). Δεν προτείνεται ενσωμάτωση.

---

## Συνοπτικός Πίνακας

| # | Feature | Tier | Data Ready | Ενσωμάτωση | Effort |
|---|---------|------|-----------|------------|--------|
| 1 | Alerts / Rescue Center | 1 | 100% | Νέο tab + badge στο nav | Medium |
| 2 | Closings Dashboard | 1 | 100% | Νέο tab | Medium |
| 3 | Exclusives Watchlist | 1 | 100% | Tab στο Portfolio ή Insights | Small |
| 4 | Deal Velocity | 1 | 100% | Tab στο Pipeline ή Insights | Small |
| 5 | Target Pacing | 1 | 100% | Section σε Agent Profile + Overview | Small |
| 6 | Revenue Forecasting | 1 | 100% | Νέο tab ή section στο Reports | Medium |
| 7 | Dark/Light Theme | 1 | N/A | Toggle στο header | Small |
| 8 | Global Search | 1 | 100% | Command palette στο header | Medium |
| 9 | Notification Bell | 1 | 100% | Icon στο header (μετά #1) | Small |
| 10 | Activity Heatmap | 2 | 90% | Section στο Accountability | Small |
| 11 | Churn Risk | 2 | 95% | Tab στο Insights | Medium |
| 12 | Data Quality | 2 | 100% | Section στο Settings | Small |
| 13 | YoY/MoM Comparison | 2 | 100% | Badges σε υπάρχοντα KPI cards | Medium |
| 14 | Market Reports | 2 | 90% | Button/section στο Reports | Large |
| 15 | Evidence Drillthrough | 2 | 80% | Cross-cutting σε KPI cards | Medium |
| 16 | Commission Tracking | 3 | 40% | Νέο tab (ops_mgr) | Large |
| 17 | Profitability / P&L | 3 | 20% | Νέο tab (ops_mgr) | Large |
| 18 | Portfolio Marketability | 1 | 100% | Sections σε Portfolio + Agent Profile + Property 360 | Medium |
| 19 | Deposits Management | 3 | 50% | Tab στο Pipeline | Medium |
| 20 | Room Booking | 3 | 0% | Δεν ταιριάζει | Large |

---

## Bonus: Features από εσωτερικά planning documents

Τα παρακάτω βρέθηκαν σε: FEATURES_STATUS.md, GAP_ANALYSIS.md, GAP_ANALYSIS_new.md, MASTER_PLAN_V2.md, PLAN.md, ROADMAP.md. Δεν καλύπτονται πλήρως από τα #1-#20 παραπάνω, αλλά προσθέτουν αξία.

---

### 21. Cohort Analysis (Property Cohorts)

**Τι είναι:**
Ομαδοποίηση ακινήτων βάσει μήνα εισαγωγής (registration_date) και tracking του lifecycle outcome τους. "Από τα 62 ακίνητα που καταχωρήθηκαν τον Ιανουάριο, 45% πήραν αποκλειστική, 18% έκλεισαν." Δείχνει πώς κάθε "γενιά" ακινήτων εξελίσσεται σε βάθος χρόνου — 30/60/90/180 ημέρες μετά την καταχώρηση.

**Γιατί σου δίνει αξία:**
Conversion rates σε snapshot δεν λένε τη real ιστορία. "45% conversion" σε ποιο χρονικό πλαίσιο; Τα cohorts απαντάνε: "Τα ακίνητα του Ιανουαρίου κλείνουν σε 90 ημέρες κατά 12%, σε 180 ημέρες κατά 22%." Βλέπεις αν η ποιότητα εισαγωγής βελτιώνεται ή χειροτερεύει μήνα-μήνα.

**Πηγή:** MASTER_PLAN_V2 (Page 11: Insights), FEATURES_STATUS (Feature 17 — missing item), ROADMAP (Phase 3)

**Δεδομένα — 100% υπάρχουν:**
- `v_property_journey` — registration_date (=cohort), has_exclusive, has_showing, has_closing, days_total_journey
- Group by: `date_trunc('month', dt_registration)` → count per milestone flag

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Insights" page** — νέο tab "Cohorts" δίπλα στα 6 υπάρχοντα tabs. Stacked area chart (cohort × outcome) + table (μήνας | registered | exclusive% | showing% | closing% | avg days to close).

---

### 22. Price Elasticity Analytics

**Τι είναι:**
Ανάλυση σχέσης μεταξύ μειώσεων τιμής και αποτελέσματος. Απαντάει: "Πόση μείωση χρειάστηκε κατά μέσο όρο για να κλείσει ένα ακίνητο;" και "Ακίνητα χωρίς μείωση κλείνουν πιο γρήγορα;". Δείχνει: μέση μείωση πριν το κλείσιμο (%), χρόνος μέχρι πρώτη μείωση, correlation μεταξύ αριθμού μειώσεων και DOM, "sweet spot" μείωσης (πόση μείωση μεγιστοποιεί πιθανότητα κλεισίματος).

**Γιατί σου δίνει αξία:**
Agents ρωτάνε "πρέπει να ρίξω τιμή;". Αντί γνώμης, δίνεις data: "Ακίνητα στη Λάρισα που έριξαν 5-10% μέσα σε 60 ημέρες είχαν 3× conversion rate σε σχέση με αυτά που δεν έριξαν τιμή." Actionable pricing guidance.

**Πηγή:** MASTER_PLAN_V2 (Page 11: Insights — 11.1), FEATURES_STATUS (Feature 17 — missing item), ROADMAP (Phase 3)

**Δεδομένα — 100% υπάρχουν:**
- `price_changes` — 8,478 records (change_date, old_price, new_price, change_pct)
- `v_property_journey` — price_delta_pct, price_reduction_count, has_closing, days_total_journey
- `v_closing_pricing` — closing_price vs listing_price

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Pricing Intelligence" page** — νέο section "Price Elasticity" κάτω από τα υπάρχοντα charts. Scatter plot (αριθμός μειώσεων × DOM), grouped bar (μέσο discount closed vs not closed), per-subcategory breakdown.

---

### 23. Morning Brief

**Τι είναι:**
Curated daily briefing — η πρώτη σελίδα που βλέπεις το πρωί. Δεν είναι το Alerts page (που είναι full list). Είναι focus view: Hero card με το #1 πιο κρίσιμο ακίνητο (τιμή, DOM, showings, agent, issues, suggested action), bento grid με τα top 5-10, plus 3-4 μικρά KPI summaries (alerts count, closings this week, expiring exclusives). Inspired by V3 Cursor "Rescue Center" Morning Brief.

**Γιατί σου δίνει αξία:**
Ξεκινάς τη μέρα με clarity: "Αυτά τα 5 ακίνητα χρειάζονται attention σήμερα." Αντί να σκανάρεις 10 σελίδες, βλέπεις τα πιο urgent σε 30 δευτερόλεπτα. Σαν executive summary για τη μέρα.

**Πηγή:** GAP_ANALYSIS.md (Feature 3 & 5), V3 Cursor (rescue-center page), V3 Ecosystem (Morning Brief)

**Δεδομένα — 100% υπάρχουν:** Ίδια πηγές με Feature #1 (Alerts). Ranked/sorted by urgency.

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Overview" page** — νέο collapsible section "Morning Brief" στο πάνω μέρος (πριν τα KPI cards), ή toggle mode στο Overview (Normal / Morning Brief). Εναλλακτικά: ενσωμάτωση ως "Priority" tab στο Alerts page (#1). **Δεν χρειάζεται νέο tab** — είναι curated view του ίδιου data.

---

### 24. Cross-Filtering / Drilldown Chips

**Τι είναι:**
Interactive filtering pattern: κλικ σε γραμμή πίνακα (π.χ. "Διαμέρισμα" στο breakdown by category) → ολόκληρη η σελίδα φιλτράρει σε αυτή την κατηγορία. Εμφανίζεται chip "Category: Διαμέρισμα ×" στο πάνω μέρος. Κλικ σε ακόμα ένα (π.χ. "Λάρισα") → AND logic. Clear all ×. Όλα τα KPIs, charts, tables ενημερώνονται.

**Γιατί σου δίνει αξία:**
Σήμερα τα breakdowns είναι read-only πίνακες. Βλέπεις "Διαμερίσματα: 48" αλλά δεν μπορείς να πεις "δείξε μου ΜΟΝΟ τα διαμερίσματα". Με cross-filtering, κάθε πίνακας γίνεται interactive φίλτρο. Power-user feature που μετατρέπει static reports σε exploratory analytics.

**Πηγή:** MASTER_PLAN_V2 (Page 7: Pricing Intelligence — core interaction pattern), Open Source BI (Superset native filters)

**Δεδομένα:** Δεν χρειάζεται νέα data — pure UI feature. Client-side filtering (ήδη γίνεται via useMemo).

**Ενσωμάτωση:**
**Cross-cutting enhancement σε υπάρχουσες σελίδες** — δεν χρειάζεται νέο tab:
- **Pricing Intelligence**: κύρια σελίδα εφαρμογής (κλικ σε category/area/condition breakdown → filter)
- **Closings Dashboard** (#2): κλικ σε breakdown → filter
- **Pipeline**: κλικ σε agent/subcategory → filter
- Reusable component: `<DrilldownChips>` + `<ClickableBreakdownTable>`

---

### 25. Median & Percentile Statistics

**Τι είναι:**
Προσθήκη median (διάμεσος) και percentile (ποσοστημόρια: P25, P75, P90) δίπλα στους μέσους όρους. Αντί "Μ.Ο. GCI: €12,500" → "Μ.Ο.: €12,500 | Median: €8,200 | P75: €18,000 | P90: €28,000". Δείχνει distribution, όχι μόνο κεντρική τάση.

**Γιατί σου δίνει αξία:**
Ο μέσος όρος είναι παραπλανητικός: αν 1 agent κάνει €100K και 9 κάνουν €5K, ο Μ.Ο. είναι €14.5K αλλά η median €5K. Η median λέει "τι κάνει ο τυπικός agent". Τα percentiles δείχνουν distribution: P90 = "τι κάνουν οι κορυφαίοι 10%". Ειδικά χρήσιμο σε DOM, GCI, deal size.

**Πηγή:** FEATURES_STATUS (Feature 16 — missing item), MASTER_PLAN_V2 (general), ROADMAP (Phase 3)

**Δεδομένα — 100% υπάρχουν:** Ίδια data, διαφορετικός υπολογισμός (sort + index αντί sum/count).

**Ενσωμάτωση:**
**Ενσωμάτωση σε υπάρχοντα components** — δεν χρειάζεται νέο tab:
- **Overview KPI cards**: tooltip ή secondary line "Median: X"
- **Agent Profile**: comparison table δείχνει percentile position
- **Pricing Intelligence**: breakdown tables αποκτούν median + P25/P75 στήλες
- **Leaderboard**: percentile badge δίπλα στο ranking
- Reusable util: `computePercentiles(values: number[], percentiles: number[])` στο `metrics.ts`

---

### 26. Sankey Flow Visualization

**Τι είναι:**
Visual flow diagram στο Pipeline page που δείχνει πώς τα ακίνητα κινούνται μεταξύ stages. Κάθε stage είναι κόμβος, τα βέλη δείχνουν πλάτος ανάλογο με τον αριθμό ακινήτων. Dropout φαίνεται ως flow προς τα κάτω (withdrawal/deactivation). Βλέπεις σε ένα glance: πόσα μπαίνουν, πόσα περνάνε, πόσα χάνονται.

**Γιατί σου δίνει αξία:**
Ο Pipeline page σήμερα έχει tabs ανά stage — δεν δείχνει τη **ροή** μεταξύ τους. Ένα Sankey chart δίνει instant εικόνα: "Από 200 registrations, 80 πήγαν σε exclusive, 40 σε showing, 15 σε offer, 8 σε closing." Κάθε bottleneck φαίνεται αμέσως (στένωμα στο flow).

**Πηγή:** MASTER_PLAN_V2 (Page 2: Pipeline — "Visual Flow" section, Sankey mentioned σε κάθε stage tab)

**Δεδομένα — 100% υπάρχουν:**
- `v_property_journey` — milestone flags (has_registration, has_exclusive, has_showing, has_offer, has_closing)
- Count per transition: `has_reg AND has_excl`, `has_excl AND has_showing`, etc.
- Dropout: `has_reg AND NOT has_excl`

**Ενσωμάτωση:**
**Ενσωμάτωση στο υπάρχον "Pipeline" page** — νέο summary section πάνω από τα stage tabs. Custom SVG component (δεν χρειάζεται βιβλιοθήκη — 5 κόμβοι, 4 flows, dropout arrows). Compact: ~200px height, full width. Click on node → activates σχετικό stage tab.

---

### 27. Property Status Badges

**Τι είναι:**
Χρωματικό status system για published ακίνητα βάσει σαφών κανόνων:
- 🟢 **Active**: Υπόδειξη τελευταίες 30 ημέρες
- 🟡 **Slow**: Published >30 ημέρες, χωρίς υπόδειξη τελευταίες 30 ημέρες
- 🔴 **Cold**: Published >90 ημέρες, χωρίς υπόδειξη τελευταίες 60 ημέρες
- ⭐ **Exclusive** badge αν έχει ενεργή αποκλειστική

**Γιατί σου δίνει αξία:**
Σήμερα βλέπεις DOM (ημέρες) αλλά πρέπει να ερμηνεύσεις: "145 ημέρες — είναι κακό;". Τα badges δίνουν instant visual classification. Σκανάρεις μια λίστα 50 ακινήτων και βλέπεις αμέσως τα 🔴 Cold. Zero cognitive load.

**Πηγή:** MASTER_PLAN_V2 (Page 5: Portfolio — Published Properties, Section 2)

**Δεδομένα — 100% υπάρχουν:**
- `v_property_pricing` — days_on_market, first_pub_date
- `ypodikseis` — showing_date (τελευταία υπόδειξη)
- `v_active_exclusives` — ενεργή αποκλειστική

**Ενσωμάτωση:**
**Ενσωμάτωση σε υπάρχοντα components** — δεν χρειάζεται νέο tab:
- **Portfolio page** (Published Properties): στήλη Status με badge
- **Agent Profile**: property table αποκτά status column
- **Property 360 modal**: badge δίπλα στο property code
- **Insights > At-Risk tab**: filter by status (show only 🔴 Cold)
- Reusable component: `<PropertyStatusBadge property={p} />`

---

## Ενημερωμένος Συνοπτικός Πίνακας

| # | Feature | Tier | Data Ready | Ενσωμάτωση | Effort |
|---|---------|------|-----------|------------|--------|
| 1 | Alerts / Rescue Center | 1 | 100% | Νέο tab + badge στο nav | Medium |
| 2 | Closings Dashboard | 1 | 100% | Νέο tab | Medium |
| 3 | Exclusives Watchlist | 1 | 100% | Tab στο Portfolio ή Insights | Small |
| 4 | Deal Velocity | 1 | 100% | Tab στο Pipeline ή Insights | Small |
| 5 | Target Pacing | 1 | 100% | Section σε Agent Profile + Overview | Small |
| 6 | Revenue Forecasting | 1 | 100% | Νέο tab ή section στο Reports | Medium |
| 7 | Dark/Light Theme | 1 | N/A | Toggle στο header | Small |
| 8 | Global Search | 1 | 100% | Command palette στο header | Medium |
| 9 | Notification Bell | 1 | 100% | Icon στο header (μετά #1) | Small |
| 10 | Activity Heatmap | 2 | 90% | Section στο Accountability | Small |
| 11 | Churn Risk | 2 | 95% | Tab στο Insights | Medium |
| 12 | Data Quality | 2 | 100% | Section στο Settings | Small |
| 13 | YoY/MoM Comparison | 2 | 100% | Badges σε υπάρχοντα KPI cards | Medium |
| 14 | Market Reports | 2 | 90% | Button/section στο Reports | Large |
| 15 | Evidence Drillthrough | 2 | 80% | Cross-cutting σε KPI cards | Medium |
| 16 | Commission Tracking | 3 | 40% | Νέο tab (ops_mgr) | Large |
| 17 | Profitability / P&L | 3 | 20% | Νέο tab (ops_mgr) | Large |
| 18 | Portfolio Marketability | 1 | 100% | Sections σε Portfolio + Agent Profile + Property 360 | Medium |
| 19 | Deposits Management | 3 | 50% | Tab στο Pipeline | Medium |
| 20 | Room Booking | 3 | 0% | Δεν ταιριάζει | Large |
| **21** | **Cohort Analysis** | **1** | **100%** | **Tab στο Insights** | **Small** |
| **22** | **Price Elasticity** | **1** | **100%** | **Section στο Pricing Intelligence** | **Small** |
| **23** | **Morning Brief** | **1** | **100%** | **Section/mode στο Overview ή Alerts** | **Small** |
| **24** | **Cross-Filtering / Drilldown Chips** | **1** | **N/A** | **Cross-cutting σε Pricing + Pipeline + Closings** | **Medium** |
| **25** | **Median & Percentile Stats** | **1** | **100%** | **Cross-cutting σε KPI cards + tables** | **Small** |
| **26** | **Sankey Flow Visualization** | **1** | **100%** | **Section στο Pipeline page** | **Medium** |
| **27** | **Property Status Badges** | **1** | **100%** | **Cross-cutting σε Portfolio + Agent Profile + 360** | **Small** |

---

*Αυτό το έγγραφο βασίζεται σε ανάλυση 7 παλαιότερων projects, πλήρη mapping Supabase views/tables, και κριτική αξιολόγηση 6 εσωτερικών planning documents (FEATURES_STATUS, GAP_ANALYSIS, GAP_ANALYSIS_new, MASTER_PLAN_V2, PLAN, ROADMAP).*
