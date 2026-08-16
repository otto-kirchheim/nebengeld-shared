// Typsystem für die PDF-Vorlagen-Pipeline (Zulagenzettel/EZ, EWT, Bereitschaft, EA).
// Konfiguration (Registry) ist die Serialisierung genau dieser Struktur.

export type Ausrichtung = 'links' | 'rechts' | 'zentriert';
export type FormatName =
  | 'waehrung'
  | 'zahl'
  | 'ganzzahl'
  | 'datum'
  | 'datumKurz'
  | 'tag'
  | 'wochentag'
  | 'monatJahr'
  | 'uhrzeit'
  | 'stunden'
  | 'liste'
  | 'grossbuchstaben';
export type OpName = 'summe' | 'anzahl' | 'max';
export type ZeilenOpName = 'produkt' | 'summe' | 'differenz' | 'quotient' | 'zeitdifferenz';

export type Zeile = Record<string, string | number | null | undefined>;
export type Daten = Record<string, unknown>;

export interface Berechnet {
  op: OpName;
  /**
   * Pfad in den Daten oder eine der reservierten Quellen: `$seite` (Zeilen dieser Seite),
   * `$bisher` (alle Zeilen der Vorseiten) oder `$alle` (alle Zeilen des Dokuments).
   */
  ueber: string;
  feld?: string;
  /**
   * Beschränkt eine `$seite`/`$bisher`/`$alle`-Summe auf EINE Tabelle (Key in `Version.tabellen`).
   * Ohne Angabe laufen die Zeilen aller Tabellen zusammen in die Rechnung.
   */
  tabelle?: string;
}

/**
 * Wert aus anderen Feldern DERSELBEN Datenzeile; Operanden sind Zeilen-Feldnamen oder Konstanten.
 * `zeitdifferenz` liest die Operanden als Uhrzeiten (`"HH:mm"` oder ISO) und liefert Minuten —
 * zusammen mit `format: 'stunden'` ergibt das eine Dauer wie `2:30` (z.B. Ende minus Beginn).
 */
export interface ZeilenBerechnet {
  op: ZeilenOpName;
  operanden: (string | number)[];
}

/**
 * Bedingter Zellinhalt: steht in `feld` einer der `werte`, erscheint `dann`, sonst bleibt die Zelle
 * leer. Deckt Ankreuz-Spalten ab — bei Bereitschaft je eine Spalte pro LRE-Stufe, die nur ein `X`
 * trägt, wenn die Zeile genau diese Stufe hat.
 */
export interface Bedingung {
  feld: string;
  werte: (string | number)[];
  dann: string;
}

/**
 * Zelle statt Punkt: `x`/`y` sind linke/untere Kante, `x2`/`y2` die gegenüberliegenden. Fehlt `x2`,
 * ist `x` der Textanker (links- bzw. rechtsbündig gegen `x`); fehlt `y2`, ist `y` direkt die
 * Text-Baseline. Mit beiden Kanten setzt der Renderer den Text horizontal laut `align` und vertikal
 * mittig in die Zelle — das ist der Normalfall aus dem Editor (Rechteck aufziehen).
 */
export interface Feld {
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  /** Schriftgröße; mit `autoGroesse` die Obergrenze, ab der verkleinert wird */
  size: number;
  /** verkleinert die Schrift, bis der Text in die Zelle passt (braucht `x2`) */
  autoGroesse?: boolean;
  /** bricht an Wortgrenzen auf mehrere Zeilen um (braucht `x2`) */
  umbruch?: boolean;
  align?: Ausrichtung;
  format?: FormatName;
  berechnet?: Berechnet;
  /**
   * Fester Text statt Datenpfad-Auflösung. Platzhalter in geschweiften Klammern werden ersetzt:
   * `{seite}`/`{seiten}` für die Seitenzahlen, jeder andere Name als Datenpfad
   * (z.B. `"Zulagenzettel {Monat}/{Jahr} — Seite {seite} von {seiten}"`).
   */
  text?: string;
  /**
   * Mehrere Datenpfade in EINE Zelle, verbunden mit `trenner` (z.B. Nachname/Vorname oder
   * Adresszeilen). Leere Teile fallen weg, damit optionale Felder keine doppelten Trennzeichen
   * hinterlassen; ein gesetztes `format` gilt für jeden Teil einzeln.
   */
  quellen?: string[];
  /** Trennzeichen für `quellen`, z.B. `", "`, `" / "`, `"; "`. Ohne Angabe ein Leerzeichen. */
  trenner?: string;
  /** nur für die Eingabemaske im Admin-Editor, für den Renderer irrelevant */
  label?: string;
}

export interface Spalte {
  key: string;
  x: number;
  /** rechte Zellkante — siehe `Feld`; die vertikale Lage kommt beim Spalten-Text aus dem Zeilenraster */
  x2?: number;
  size: number;
  autoGroesse?: boolean;
  umbruch?: boolean;
  align?: Ausrichtung;
  format?: FormatName;
  maxBreite?: number;
  berechnet?: ZeilenBerechnet;
  /** Ankreuz-Spalte: nur befüllt, wenn die Bedingung zutrifft (siehe `Bedingung`) */
  wenn?: Bedingung;
  label?: string;
}

/**
 * Eine Datentabelle. Der `filter` erlaubt mehrere Tabellen aus DERSELBEN Quelle — bei Bereitschaft
 * speist `Daten.BE` je eine Tabelle für LRE 1+2 und für LRE 3.
 */
export interface TabellenDef {
  /** Datenpfad zur Zeilenliste, z.B. `Daten.BE` */
  quelle: string;
  /** nur Zeilen behalten, deren `feld` einen der `werte` trägt */
  filter?: { feld: string; werte: (string | number)[] };
  hoehe: number;
  spalten: Spalte[];
}

/** Platz, den eine Tabelle auf einer konkreten Seite einnimmt. */
export interface TabellenBereich {
  /** Key in `Version.tabellen` */
  tabelle: string;
  startY: number;
  maxZeilen: number;
}

export interface SeitenDef {
  /** Index der Quellseite in der Vorlagen-PDF */
  quelle: number;
  /**
   * Welche Tabellen auf dieser Seite liegen und wo. Mehrere sind erlaubt (Bereitschaft trägt BZ,
   * BE/LRE 1+2 und BE/LRE 3), eine Seite ohne Datentabelle ist ebenfalls zulässig.
   */
  bereiche: TabellenBereich[];
  /**
   * Alle Zellen außerhalb der Datentabelle — Kopfangaben, Zwischen- und Gesamtsummen,
   * Übertragszeilen, Seitenzahl. Ursprünglich in `kopf`/`seitenfuss`/`fuss` aufgeteilt; die
   * ersten beiden waren im Renderer identisch, und der einzige echte Unterschied (`fuss` rechnete
   * über alle Zeilen statt über die aktuelle Seite) steckt jetzt dort, wo er hingehört: in
   * `Berechnet.ueber` (`$seite`/`$bisher`/`$alle`). Die Position ergibt sich ohnehin allein aus
   * den Koordinaten, nicht aus dem Bereich.
   */
  felder: Record<string, Feld>;
  signaturBild?: { x: number; y: number; w: number; h: number };
}

export interface Layout {
  /** Eine PDF-Datei für die ganze Version — die ursprüngliche Aufteilung in zwei Dateien
   * (einseitig/mehrseitig) war nur wegen Kandidat C (pyHanko-Signaturfeld-Namenskollision)
   * nötig und entfällt unter Kandidat E (siehe Plan, Phase 5). */
  template: string;
  /** Wird immer genau einmal gerendert. */
  ersteSeite: SeitenDef;
  /** Wird bei Zeilenüberlauf beliebig oft wiederholt; fehlt sie und reichen die Zeilen nicht
   * auf `ersteSeite`, wirft `verteile()`. */
  weitereSeite?: SeitenDef;
}

export interface Version {
  version: string;
  gueltigVon: string;
  gueltigBis: string | null;
  layout: Layout;
  /** Alle Datentabellen des Formulars, adressiert über ihren Key aus `TabellenBereich.tabelle`. */
  tabellen: Record<string, TabellenDef>;
}

export interface Formular {
  titel: string;
  versionen: Version[];
}

export type Registry = Record<string, Formular>;
