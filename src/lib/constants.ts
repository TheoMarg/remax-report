/**
 * ALLOWED agent IDs — only these agents appear in the dashboard.
 * Based on BROKER_REPORT_RULES.md
 */

// Λάρισα - Individual agents
const LARISSA_INDIVIDUAL = [1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 106];

// Κατερίνη - Individual agents (108 = duplicate of 7, included for data)
const KATERINI_INDIVIDUAL = [5, 6, 7, 8, 9, 10, 18, 19, 108];

// Team members (Λάρισα)
const TEAM_MEMBERS = [20, 21, 22, 23, 24, 27, 28, 29, 30, 104, 105];

// Team virtual CRM accounts
const TEAM_ACCOUNTS = [33, 34, 35, 103];

export const ALLOWED_AGENT_IDS = [
  ...LARISSA_INDIVIDUAL,
  ...KATERINI_INDIVIDUAL,
  ...TEAM_MEMBERS,
  ...TEAM_ACCOUNTS,
];

/**
 * Team → virtual CRM agent IDs mapping.
 * Team CRM data lives under these agent IDs, not under individual members.
 * Per BROKER_REPORT_RULES: "Στο CRM, τα listings των team members εμφανίζονται
 * κάτω από τον team agent_id (33, 34, 35, 103)"
 */
export const TEAM_VIRTUAL_AGENTS: Record<number, number[]> = {
  1: [33],       // Team Γιαννακός
  2: [34],       // Team Δερβένης
  3: [35, 103],  // Team Γκουγκούδης (2 CRM accounts)
};
