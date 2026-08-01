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

// ─── Tarif-/Besoldungsgruppe (Pers.TB) ───────────────────
/**
 * Zulässige Werte für `Pers.TB`. Der Wert wird in der Berechnung als Schlüssel
 * in die Geld-Vorgaben benutzt (`IVorgabeValue[TB]`) — ein abweichender Text
 * ergibt dort `undefined` und damit NaN-Beträge. Deshalb ist die Liste
 * verbindlich und wird in Zod, Mongoose und den Auswahlfeldern der Oberfläche
 * aus dieser einen Quelle gespeist.
 */
export const TB_VALUES = ['Besoldungsgruppe A 8', 'Besoldungsgruppe A 9', 'Tarifkraft'] as const;

export type TarifBesoldung = (typeof TB_VALUES)[number];

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
