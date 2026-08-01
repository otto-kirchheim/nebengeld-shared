// Domain-Modell-Typen (Welle 2) — Feldnamen folgen dem Backend-Wire-Format
// (siehe .claude/plans/plane-das-auslagern-von-concurrent-pearl.md, Abschnitt "Welle 2").

/**
 * Vorgaben-Wert (Jahres-Tarife/Pauschalen). Alle Felder optional: ein
 * Vorgaben-Eintrag pro Monat überschreibt nur die geänderten Felder kumulativ
 * (siehe backend vorgabe.service.ts / frontend createDatenGeldProxy).
 */
export interface IVorgabeValue {
  BE14?: number;
  BE8?: number;
  'Besoldungsgruppe A 8'?: number;
  'Besoldungsgruppe A 9'?: number;
  A?: number;
  B?: number;
  C?: number;
  Fahrentsch?: number;
  SIPO?: number;
  LRE1?: number;
  LRE2?: number;
  LRE3?: number;
  PrivatPKWTarif?: number;
  PrivatPKWBeamter?: number;
  Tarifkraft?: number;
  TE14?: number;
  TE24?: number;
  TE8?: number;
  [key: string]: number | undefined;
}

export interface IVorgabeEntry {
  key: number;
  value: IVorgabeValue;
}
