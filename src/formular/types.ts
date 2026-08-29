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
  | 'monatName'
  | 'monatNameKurz'
  | 'uhrzeit'
  | 'stunden'
  | 'liste'
  | 'grossbuchstaben'
  | 'jaNein'
  | 'oe';
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

/**
 * Schriftfamilie: `'helvetica'` | `'times'` | `'courier'` sind die Standard-14-Fonts (im PDF nicht
 * eingebettet). `'vorlage:<Name>'` verweist auf eine in der Template-PDF eingebettete Schrift
 * (Testschritt, Extraktion siehe FormularEditor). Als `string` typisiert, damit eingebettete Namen
 * mitgeführt werden können.
 */
export type Schriftfamilie = string;

/**
 * Schriftart des ganzen Formulars (siehe `Layout.schriftart`). Entweder eine Familie für alle vier
 * Schnitte, oder je Schnitt eine eigene -- z.B. eine eingebettete Vorlagen-Schrift für
 * `normal`/`fett` und Helvetica für `kursiv`, wenn die Vorlage keinen Kursiv-Schnitt mitbringt.
 * Fehlt ein Schnitt im Objekt, gilt `normal`; fehlt auch der, gilt `'helvetica'`. Fett/Kursiv je
 * Zelle steuert weiterhin `Feld.fett`/`kursiv` -- hier steht nur, WELCHE Schrift der jeweilige
 * Schnitt nutzt.
 */
export type Schriftart =
  | Schriftfamilie
  | {
      normal?: Schriftfamilie;
      fett?: Schriftfamilie;
      kursiv?: Schriftfamilie;
      fettKursiv?: Schriftfamilie;
    };

export interface Berechnet {
  op: OpName;
  /**
   * Pfad in den Daten oder eine der reservierten Quellen: `$seite` (Zeilen dieser Seite),
   * `$bisher` (alle Zeilen der Vorseiten) oder `$alle` (alle Zeilen des Dokuments).
   */
  ueber: string;
  feld?: string;
  /**
   * Beschränkt eine `$seite`/`$bisher`/`$alle`-Summe auf eine oder mehrere Tabellen (Keys in
   * `Version.tabellen`) -- ihre Zeilen laufen dann zusammen in EINE Rechnung. Ohne Angabe (oder
   * leeres Array) laufen die Zeilen ALLER Tabellen der Version zusammen.
   */
  tabellen?: string[];
  /**
   * Nur für `letztesDatum`: Höchstalter des jüngsten Eintrags in Tagen. Ist er älter — oder gibt es
   * gar keine Zeilen —, wird stattdessen das heutige Datum genommen. Gedacht für das Datum neben
   * der Unterschrift: unterschrieben wird am Tag der letzten Leistung, sofern die noch nicht lange
   * zurückliegt, sonst heute. Ohne Angabe bleibt es immer beim letzten Eintrag.
   */
  maxTage?: number;
  /**
   * Summe über einen dynamischen Spaltenplatz (siehe `Feld.listenKopf`/`ListenPlatz`), NICHT über
   * einen festen Code: welcher Zulagen-Code an Platz `index` einer Gruppe landet, steht erst mit den
   * Daten des Monats fest (`schluesselAufPlatz()`/`listenBelegung()` in `listen.ts`) -- ein fest
   * eingetragener Code würde von Monat zu Monat an der Spaltenüberschrift vorbeirechnen, sobald sich
   * die Platzbelegung verschiebt (z.B. weil ein Code diesen Monat gar nicht vorkommt). Summiert wird
   * deshalb IMMER über denselben, zur Laufzeit aufgelösten Code wie die zugehörige Kopfzeile. Nur
   * für `op: 'summe'` vorgesehen; `feld` bleibt dabei leer.
   *
   * `art` (Default `'summe'`, gleiche Werte wie `SonderZeileZelle.art` ohne `'kopf'`): `'summe'`
   * roh (Minuten/Stück), `'bereinigt'` Minuten-Codes auf volle Stunden gerundet (Stück-Codes tragen
   * `0` bei, siehe `bereinigteZulagenStunden()`), `'summeGeld'` Umrechnung in Euro über
   * `geldwertZulagenCode()` (repliziert `calculateBerechnungRows.ts`s `N_ZULAGEN_CALC`-Formel je
   * `paymentHint`).
   *
   * Ohne `index`: Gesamtsumme über ALLE Einträge der Gruppe, jeder mit seinem EIGENEN Code statt
   * einem Platz-Code -- `art` gilt genauso, angewandt auf jeden Eintrag einzeln vor der Summierung.
   */
  liste?: { tabelle: string; gruppe: string; index?: number; art?: Exclude<SonderZeileArt, 'kopf'> };
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
 * Vergleich: `werte` (Kreuz, wenn der Wert einer davon ist -- inkl. `boolean` für echte
 * Ankreuz-Quellfelder wie `Wohnung8bis14`, siehe `abgeleiteteWerte.ts`) ODER `bereich` (Kreuz, wenn
 * der Wert im Intervall liegt, `von` einschließlich, `bis` ausschließlich — z.B. Einsatzdauer ab
 * 8:00 bis vor 14:00, oder Privat-km ab 5 bis 20) — genau eines ist gesetzt. Gelesen über
 * `alsVergleichswert`: passt sich dem jeweiligen Wert an (Zahl, `"HH:mm"` oder voller Zeitstempel),
 * keine feste Annahme über die Feldart.
 */
export interface Bedingung {
  feld?: string;
  berechnet?: ZeilenBerechnet;
  werte?: (string | number | boolean)[];
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
  werte?: (string | number | boolean)[];
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
   * Blendet das Feld komplett aus, wenn explizit eine DIGITALE Signatur gewählt wurde (spätere
   * externe Unterschrift zu unbekanntem Zeitpunkt) -- gedacht für das Unterschriftsdatum, das dann
   * falsch wäre. Bei "Ohne Unterschrift" (z.B. für eine spätere Unterschrift auf Papier) bleibt das
   * Feld dagegen sichtbar, nur "Digital" blendet es aus (siehe `Kontext.digitaleSignatur` im
   * Frontend-Renderer). Wird über die Signatur-Fläche im FormularEditor gesetzt (siehe
   * `FeldPanel.tsx`), nicht über die allgemeine Feldliste.
   */
  nurBeiSignatur?: boolean;
  /**
   * Überschrift eines dynamischen Spaltenplatzes: zeigt den Schlüssel, der auf diesem Platz
   * gelandet ist (bei EZ den Zulagen-Code über der zugehörigen Spalte). Welcher das ist, steht
   * erst mit den Daten fest — siehe `ListenGruppe`.
   */
  listenKopf?: ListenPlatz & { tabelle: string };
  /** Dreht den Text in der Zelle; 90° liest von unten nach oben (schmale Kopfspalten). */
  drehung?: Drehung;
  fett?: boolean;
  kursiv?: boolean;
  unterstrichen?: boolean;
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

export type SonderZeileArt = 'kopf' | 'summe' | 'bereinigt' | 'summeGeld';

/**
 * Eine Zelle einer `SonderZeile`: referenziert eine Spalte statt eigener Koordinaten -- die
 * x-Position kommt beim Rendern von genau dieser Spalte, nur die y-Position kommt von der
 * Platzierung (`TabellenBereich.sonderzeilen`). `bereinigt`/`summeGeld` ergeben nur bei einer
 * Spalte mit `listenPlatz` einen Wert (siehe `sonderZeileZelleWert()` in `wert.ts`).
 *
 * Bezug über die Position in `TabellenDef.spalten`, NICHT über `Spalte.key`: der bleibt bei vielen
 * Spaltenarten leer und mehrfach vergeben -- dynamische Spalten (`listenPlatz`) UND Ankreuz-Spalten
 * (`wenn`, deren Wert erst je Zeile aus der Bedingung entsteht) brauchen beide keinen flachen
 * Zeilenpfad und bleiben in der Praxis regelmäßig ohne `key`. Ein Bezug über `key` könnte sie dann
 * nicht unterscheiden -- betroffen wären z.B. alle sechs EWT-Zeitband-Ankreuzspalten auf einmal.
 */
export interface SonderZeileZelle {
  /** Index in `TabellenDef.spalten`. */
  spaltenIndex: number;
  art: SonderZeileArt;
  /** Ohne Angabe gilt `Spalte.format` -- eine Summen-/€-Zeile braucht praktisch immer ein eigenes,
   *  weil die Spalte selbst den Rohwert unformatiert zeigt. */
  format?: FormatName;
  /** Ohne Angabe gilt `Spalte.size` -- eine Summenzeile will oft eine andere Schriftgröße als die
   *  Datenzeilen (z.B. fett/größer für die Gesamtsumme). */
  size?: number;
  /** Ohne Angabe gilt `Spalte.align`. */
  align?: Ausrichtung;
  /** Ohne Angabe gilt `Spalte.autoGroesse`. */
  autoGroesse?: boolean;
  /** Ohne Angabe gilt `Spalte.fett`. */
  fett?: boolean;
  /** Ohne Angabe gilt `Spalte.kursiv`. */
  kursiv?: boolean;
  /** Ohne Angabe gilt `Spalte.unterstrichen`. */
  unterstrichen?: boolean;
}

/**
 * Kopf- oder Fußzeile EINER Tabelle, die für mehrere Spalten auf einmal "was steht hier" festlegt
 * -- Gegenstück zu 44 einzeln platzierten `Feld`-Einträgen bei EZ (elf Zulagen-Spaltenplätze mal
 * Überschrift/Summe/bereinigte Summe/Summe in Euro). Inhalt (diese Struktur) und Platzierung
 * (`TabellenBereich.sonderzeilen`) sind getrennt: dieselbe Sonderzeile kann auf einer Seite mehrfach
 * erscheinen (z.B. Überschrift oben UND als Kopie unten), ohne die Spaltenzuordnung zu duplizieren.
 */
export interface SonderZeile {
  /** Wie `Berechnet.ueber` ($seite/$bisher/$laufend/$alle) -- nur für summe/bereinigt/summeGeld
   *  relevant, bei einer reinen Kopf-Zeile ungenutzt. Fehlt der Wert, gilt `$alle`. */
  ueber?: string;
  zellen: SonderZeileZelle[];
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
  fett?: boolean;
  kursiv?: boolean;
  unterstrichen?: boolean;
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
  /** Globaler Standard für Seiten ohne eigenen Wert, siehe `TabellenBereich.startY`. */
  startY: number;
  /** Globaler Standard für Seiten ohne eigenen Wert, siehe `TabellenBereich.maxZeilen`. */
  maxZeilen: number;
  hoehe: number;
  spalten: Spalte[];
  /**
   * Druckt die Tabelle um diesen Winkel gedreht (gegen den Uhrzeigersinn), wenn die Vorlage das
   * Formular gedreht zeigt. Die übrigen Werte (`startY`, `spalten[].x`, `hoehe`) bleiben im
   * aufrechten Layout gedacht; Renderer und Editor-Vorschau drehen jede fertige Zelle um den
   * Seitenmittelpunkt. Ohne Angabe `0`. Seiten-Override: `TabellenBereich.drehung`.
   */
  drehung?: Drehung;
  /** Dynamische Spaltengruppen dieser Tabelle (EZ: Erschwerniszulagen, Leistungsprämie, GKR) */
  listen?: Record<string, ListenGruppe>;
  /** Kopf-/Fußzeilen-Inhalte dieser Tabelle, adressiert über ihren Namen (siehe `SonderZeile`) --
   *  WO sie erscheinen, legt `TabellenBereich.sonderzeilen` je Seite fest. */
  sonderzeilen?: Record<string, SonderZeile>;
}

/**
 * Platz, den eine Tabelle auf einer konkreten Seite einnimmt. `tabelle` ist das einzige
 * Pflichtfeld -- alles andere ist ein optionaler Seiten-Override, ohne Angabe gilt jeweils der
 * globale Wert der Tabelle (`TabellenDef`). Deckt Vorlagen ab, deren Seiten sich in Position,
 * Zeilenhöhe, Zeilenzahl oder Spaltenraster unterscheiden (z.B. eine Übertragsspalte nur auf
 * Folgeseiten), ohne identische Werte auf jeder Seite wiederholen zu müssen.
 */
export interface TabellenBereich {
  /** Key in `Version.tabellen` */
  tabelle: string;
  startY?: number;
  maxZeilen?: number;
  /**
   * Eigene Spalten NUR für diese Seite; ohne Angabe gelten die der Tabelle. Deckt Vorlagen ab,
   * deren Folgeseite ein anderes Spaltenraster hat (andere Breiten oder gar andere Spalten als die
   * erste Seite). Die Werte kommen weiterhin aus derselben Tabelle — überschrieben wird nur, WO und
   * WIE gezeichnet wird. Eine berechnete Spalte, die es nur hier gibt, wird zwar gedruckt, taucht
   * aber nicht in den Zeilendaten auf und ist damit nicht summierbar; solche Spalten gehören in
   * `TabellenDef.spalten`.
   */
  spalten?: Spalte[];
  hoehe?: number;
  /** Seitenspezifische Drehung; ohne Angabe gilt `TabellenDef.drehung`. */
  drehung?: Drehung;
  /**
   * Platzierungen der Tabellen-Sonderzeilen auf DIESER Seite -- `name` verweist auf
   * `TabellenDef.sonderzeilen`. Ein `name` darf mehrfach vorkommen (z.B. Überschrift oben UND als
   * Kopie unten): eine Inhaltsdefinition, mehrere Positionen.
   */
  sonderzeilen?: { name: string; y: number; y2?: number }[];
}

export interface SeitenDef {
  /** Index der Quellseite in der Vorlagen-PDF */
  quelle: number;
  /**
   * Punkt-Maße der Vorlagenseite, gegen die die Koordinaten dieser Seite gesetzt wurden. Wird vom
   * FormularEditor beim Laden der Vorlage gefüllt und ist die Referenz für die Skalierung beim
   * Wechsel auf eine andere Vorlage (andere Seitengröße/Auflösung). Der Renderer nutzt sie nicht.
   */
  groesse?: { w: number; h: number };
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
   * Schrift für den gesamten Fließtext des Formulars (siehe `Schriftart`). Ohne Angabe `'helvetica'`.
   * Gilt für alle Felder, Spalten und Sonderzeilen; welcher Schnitt je Zelle greift, bestimmen
   * `Feld.fett`/`kursiv`.
   */
  schriftart?: Schriftart;
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
