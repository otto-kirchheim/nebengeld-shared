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
  | 'tagZweistellig'
  | 'wochentag'
  | 'monatJahr'
  | 'uhrzeit'
  | 'stunden'
  | 'liste'
  | 'grossbuchstaben';
export type OpName = 'summe' | 'anzahl' | 'max' | 'letztesDatum';
export type ZeilenOpName = 'produkt' | 'summe' | 'differenz' | 'quotient' | 'zeitdifferenz' | 'zeitspanne';

/**
 * Eine Datenzeile, wie sie aus dem Download-Body kommt. Werte sind bewusst `unknown`: neben Text
 * und Zahl steckt dort auch Verschachteltes — bei EZ trägt jede Zeile unter `Zulagen` eine Liste
 * von Einträgen, die erst über `ListenGruppe` zu Spalten wird.
 */
export type Zeile = Record<string, unknown>;
export type Daten = Record<string, unknown>;

/** Drehung des Textes in einer Zelle, in Grad gegen den Uhrzeigersinn. */
export type Drehung = 0 | 90 | 180 | 270;

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
  /**
   * Nur für `letztesDatum`: Höchstalter des jüngsten Eintrags in Tagen. Ist er älter — oder gibt es
   * gar keine Zeilen —, wird stattdessen das heutige Datum genommen. Gedacht für das Datum neben
   * der Unterschrift: unterschrieben wird am Tag der letzten Leistung, sofern die noch nicht lange
   * zurückliegt, sonst heute. Ohne Angabe bleibt es immer beim letzten Eintrag.
   */
  maxTage?: number;
}

/**
 * Operand einer Zeilenrechnung: Zeilen-Feldname, feste Zahl — oder eine geklammerte
 * Zwischenrechnung. Die Verschachtelung ersetzt Punkt-vor-Strich: die Gruppierung steht explizit
 * in der Struktur, es gibt keine implizite Vorrangregel, die man falsch erwarten könnte.
 */
export type ZeilenOperand = string | number | ZeilenBerechnet;

/**
 * Wert aus anderen Feldern DERSELBEN Datenzeile.
 *
 * Zeit-Operatoren liefern beide Minuten (mit `format: 'stunden'` also eine Dauer wie `2:30`),
 * unterscheiden sich aber im Bezug: `zeitdifferenz` rechnet mit Uhrzeiten EINES Tages (`"HH:mm"`)
 * und ergänzt über Mitternacht 24 h; `zeitspanne` rechnet mit vollständigen Zeitstempeln und darf
 * deshalb über mehrere Tage laufen (Bereitschaftszeitraum). Der falsche Operator liefert stille
 * Fehlwerte — ein mehrtägiger Zeitraum käme über `zeitdifferenz` als Rest unter 24 h heraus.
 *
 * Gemischte Rechnungen entstehen durch Schachtelung, z.B. Ende − Beginn + Pause als
 * `{ op: 'summe', operanden: [{ op: 'zeitspanne', operanden: ['Ende', 'Beginn'] }, 'Pause'] }`.
 */
export interface ZeilenBerechnet {
  op: ZeilenOpName;
  operanden: ZeilenOperand[];
}

/**
 * Bedingter Zellinhalt: erscheint `dann`, sonst bleibt die Zelle leer. Deckt Ankreuz-Spalten ab —
 * bei Bereitschaft je eine Spalte pro LRE-Stufe, die nur ein `X` trägt, wenn die Zeile genau diese
 * Stufe hat.
 *
 * Geprüfter Wert: `feld` (Zeilen-Feldname) ODER `berechnet` (Rechnung über Felder derselben Zeile,
 * z.B. eine Dauer aus zwei Uhrzeiten) — genau eines ist gesetzt.
 *
 * Vergleich: `werte` (Kreuz, wenn der Wert einer davon ist) ODER `bereich` (Kreuz, wenn der Wert im
 * Intervall liegt, `von` einschließlich, `bis` ausschließlich — z.B. Einsatzdauer ab 8:00 bis vor
 * 14:00, oder Privat-km ab 5 bis 20) — genau eines ist gesetzt. Gelesen über `alsVergleichswert`:
 * passt sich dem jeweiligen Wert an (Zahl, `"HH:mm"` oder voller Zeitstempel), keine feste Annahme
 * über die Feldart.
 */
export interface Bedingung {
  feld?: string;
  berechnet?: ZeilenBerechnet;
  werte?: (string | number)[];
  bereich?: { von: string | number; bis: string | number };
  dann: string;
}

/**
 * Bedingter Feld-Inhalt -- das Gegenstück zu `Bedingung`, aber auf Dokumentebene statt Zeilenebene:
 * `Feld` rendert einmal je Seite, hat also keinen Zeilenbezug wie eine Tabellenspalte. Deckt z.B.
 * einen Hinweistext ab, der nur bei Gesamtsumme > 0 erscheint.
 *
 * Geprüfter Wert: `feld` (Datenpfad in `Daten`, z.B. ein Personenfeld) ODER `berechnet`
 * (Aggregation über Zeilen, siehe `Berechnet`) — genau eines ist gesetzt. Vergleich wie bei
 * `Bedingung`: `werte` (Mitgliedschaft) ODER `bereich` (Intervall).
 */
export interface FeldBedingung {
  feld?: string;
  berechnet?: Berechnet;
  werte?: (string | number)[];
  bereich?: { von: string | number; bis: string | number };
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
   * `{seite}`/`{seiten}` für die Seitenzahlen, `{heute}` für das Erzeugungsdatum, jeder andere Name
   * als Datenpfad (z.B. `"Zulagenzettel {Monat}/{Jahr} — Seite {seite} von {seiten}"`). Deckt auch
   * mehrere kombinierte Datenpfade ab (z.B. `"{Nachname}, {Vorname}"`) -- ohne `quellen`s
   * Leerteile-Filter, für den einfachen Fall reicht das meist.
   */
  text?: string;
  /**
   * Mehrere Datenpfade in EINE Zelle, verbunden mit `trenner` (z.B. Adresszeilen). Leere Teile
   * fallen weg, damit optionale Felder (z.B. `Adress2`) keine doppelten Trennzeichen hinterlassen —
   * das kann `text`s Platzhalter-Ersetzung nicht (dort bleibt die Trennzeichen-Literale stehen, auch
   * wenn ein Platzhalter leer auflöst); ein gesetztes `format` gilt für jeden Teil einzeln.
   */
  quellen?: string[];
  /** Trennzeichen für `quellen`, z.B. `", "`, `" / "`, `"; "`. Ohne Angabe ein Leerzeichen. */
  trenner?: string;
  /** Zeigt `wenn.dann` nur, wenn die Bedingung zutrifft, sonst bleibt die Zelle leer. */
  wenn?: FeldBedingung;
  /**
   * Überschrift eines dynamischen Spaltenplatzes: zeigt den Schlüssel, der auf diesem Platz
   * gelandet ist (bei EZ den Zulagen-Code über der zugehörigen Spalte). Welcher das ist, steht
   * erst mit den Daten fest — siehe `ListenGruppe`.
   */
  listenKopf?: ListenPlatz & { tabelle: string };
  /** Dreht den Text in der Zelle; 90° liest von unten nach oben (schmale Kopfspalten). */
  drehung?: Drehung;
  /** nur für die Eingabemaske im Admin-Editor, für den Renderer irrelevant */
  label?: string;
}

/** Verweis auf einen dynamischen Spaltenplatz: `index` ist der wievielte belegte Platz der Gruppe. */
export interface ListenPlatz {
  /** Key in `TabellenDef.listen` */
  gruppe: string;
  index: number;
}

/**
 * Spalten, deren Inhalt erst aus den Daten entsteht: EZ hat für Erschwerniszulagen sieben Plätze
 * im Formular, welche Zulagen-Codes dort stehen, hängt vom Monat ab. Aus allen Zeilen wird
 * ermittelt, welche Schlüssel überhaupt vorkommen; sie belegen der Reihe nach die Plätze, und jede
 * Zeile trägt in ihrer Spalte den Wert zu genau diesem Schlüssel (oder nichts).
 */
export interface ListenGruppe {
  /** Feld der Datenzeile mit der Liste, z.B. `Zulagen` */
  quelle: string;
  /** Feld eines Listeneintrags mit dem Schlüssel, z.B. `Typ` */
  schluessel: string;
  /** Feld eines Listeneintrags mit dem anzuzeigenden Wert, z.B. `Wert` */
  wert: string;
  /**
   * Erlaubte Schlüssel in fester Reihenfolge — sie bestimmt, welcher Schlüssel welchen Platz
   * bekommt. Ohne Angabe zählt die Reihenfolge des ersten Vorkommens in den Daten.
   */
  auswahl?: string[];
  /** Beschriftung je Schlüssel für die Überschrift; ohne Eintrag erscheint der Schlüssel selbst. */
  beschriftungen?: Record<string, string>;
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
  /** Dynamischer Platz aus einer `ListenGruppe` statt eines festen Zeilenfelds (siehe dort) */
  listenPlatz?: ListenPlatz;
  drehung?: Drehung;
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
  /** Dynamische Spaltengruppen dieser Tabelle (EZ: Erschwerniszulagen, Leistungsprämie, GKR) */
  listen?: Record<string, ListenGruppe>;
}

/** Platz, den eine Tabelle auf einer konkreten Seite einnimmt. */
export interface TabellenBereich {
  /** Key in `Version.tabellen` */
  tabelle: string;
  startY: number;
  maxZeilen: number;
  /**
   * Eigene Spalten NUR für diese Seite; ohne Angabe gelten die der Tabelle. Deckt Vorlagen ab,
   * deren Folgeseite ein anderes Spaltenraster hat (andere Breiten oder gar andere Spalten als die
   * erste Seite). Die Werte kommen weiterhin aus derselben Tabelle — überschrieben wird nur, WO und
   * WIE gezeichnet wird. Eine berechnete Spalte, die es nur hier gibt, wird zwar gedruckt, taucht
   * aber nicht in den Zeilendaten auf und ist damit nicht summierbar; solche Spalten gehören in
   * `TabellenDef.spalten`.
   */
  spalten?: Spalte[];
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
  /**
   * Diese Seite wird bei Zeilenüberlauf so oft wiederholt, wie ihre Tabellen noch Zeilen haben.
   * Ohne eine solche Seite wirft `verteile()`, sobald Zeilen übrig bleiben. Bei EA ist es die
   * einzige Seite, bei Bereitschaft die letzte (Seiten 3 und 4 sind gleich, 1 und 2 nicht).
   */
  wiederholt?: boolean;
}

export interface Layout {
  /** Eine PDF-Datei für die ganze Version — die ursprüngliche Aufteilung in zwei Dateien
   * (einseitig/mehrseitig) war nur wegen Kandidat C (pyHanko-Signaturfeld-Namenskollision)
   * nötig und entfällt unter Kandidat E (siehe Plan, Phase 5). */
  template: string;
  /**
   * Seitenfolge des Formulars, mindestens eine Seite. Die frühere Aufteilung in `ersteSeite` +
   * `weitereSeite` reichte nicht: Bereitschaft sieht auf den Seiten 1, 2 und 3 unterschiedlich aus
   * und wiederholt erst ab Seite 3. Jede Seite verweist über `quelle` auf eine Seite der
   * Vorlagen-PDF; welche Seiten tatsächlich im Ergebnis landen, entscheidet die Datenmenge
   * (siehe `verteile()`).
   */
  seiten: SeitenDef[];
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
