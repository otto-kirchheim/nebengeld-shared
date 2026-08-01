// ─── Benutzerrollen ───────────────────────────────────────
export enum Role {
  MEMBER = 'member',
  TEAM_ADMIN = 'team-admin',
  ORG_ADMIN = 'org-admin',
  SUPER_ADMIN = 'super-admin',
}

// Hierarchie: höherer Wert = mehr Rechte
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.MEMBER]: 1,
  [Role.TEAM_ADMIN]: 2,
  [Role.ORG_ADMIN]: 3,
  [Role.SUPER_ADMIN]: 4,
};

// ─── LRE-Typen (Bereitschaftseinsatz) ────────────────────
export enum LreType {
  LRE_1 = 'LRE 1',
  LRE_2 = 'LRE 2',
  LRE_1_2_OHNE_X = 'LRE 1/2 ohne x',
  LRE_3 = 'LRE 3',
  LRE_3_OHNE_X = 'LRE 3 ohne x',
}

// ─── Ressourcen-Kürzel (Frontend-CRUD-Tabellen) ──────────
export type ResourceKey = 'BZ' | 'BE' | 'EWT' | 'N' | 'settings';

// ─── Speicher-Status (Frontend AutoSave) ─────────────────
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'blocked';

// ─── Wochentag (isoWeekday 1–7) ──────────────────────────
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
