// Typsystem für die PDF-Vorlagen-Pipeline (Zulagenzettel/EZ, EWT, Bereitschaft, EA).
// Konfiguration (Registry) ist die Serialisierung genau dieser Struktur.

export type Ausrichtung = 'links' | 'rechts';
export type FormatName = 'waehrung' | 'datum';
export type OpName = 'summe' | 'anzahl' | 'max';

export type Zeile = Record<string, string | number | null | undefined>;
export type Daten = Record<string, unknown>;

export interface Berechnet {
  op: OpName;
  /** Pfad in den Daten, oder die reservierten Quellen `$seite` / `$bisher` */
  ueber: string;
  feld?: string;
}

export interface Feld {
  x: number;
  y: number;
  size: number;
  align?: Ausrichtung;
  format?: FormatName;
  berechnet?: Berechnet;
  /** nur für die Eingabemaske im Admin-Editor, für den Renderer irrelevant */
  label?: string;
}

export interface Spalte {
  key: string;
  x: number;
  size: number;
  align?: Ausrichtung;
  format?: FormatName;
  maxBreite?: number;
  label?: string;
}

export interface SeitenDef {
  /** Index der Quellseite in der Vorlagen-PDF */
  quelle: number;
  maxZeilen: number;
  startY: number;
  /** je Seite unterschiedlich: voller Kopf vs. schmale Kennzeile vs. leer */
  kopf: Record<string, Feld>;
  seitenfuss?: Record<string, Feld>;
  /** nur auf der Abschlussseite gesetzt */
  fuss?: Record<string, Feld>;
  signaturBild?: { x: number; y: number; w: number; h: number };
}

export interface Layout {
  template: string;
  /** Seiten in Reihenfolge; die letzte trägt Fuß und Signaturblock */
  seiten: SeitenDef[];
  /** Index der Seite, die bei Überlauf wiederholt wird */
  wiederholSeite?: number;
}

export interface Version {
  version: string;
  gueltigVon: string;
  gueltigBis: string | null;
  einseitig: Layout;
  mehrseitig: Layout;
  zeilen: { quelle: string; hoehe: number; spalten: Spalte[] };
}

export interface Formular {
  titel: string;
  versionen: Version[];
}

export type Registry = Record<string, Formular>;
