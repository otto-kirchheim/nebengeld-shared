// Domain-Modell-Typen (Welle 2) — Feldnamen folgen dem Backend-Wire-Format
// (siehe .claude/plans/plane-das-auslagern-von-concurrent-pearl.md, Abschnitt "Welle 2").

import type { BereitschaftSchichtTyp, LreType, Role, TarifBesoldung } from './enums';

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
  /** Satz je Ganzkörperreinigung (Code 218, Stück) -- bisher ohne Geldformel, siehe abgeleiteteWerte.ts::geldwertZulagenCode. */
  GKR?: number;
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

/**
 * Bereitschaftszeitraum (Wire-Format). `Beginn`/`Ende` sind volle
 * ISO-Zeitstempel (mehrtägiger Zeitraum) — anders als bei Bereitschaftseinsatz
 * oder Nebengeld, wo `Beginn`/`Ende` reine `"HH:mm"`-Uhrzeiten eines
 * Tages-Eintrags sind. Bewusst kein gemeinsamer Basis-Typ über Ressourcen
 * hinweg (siehe Plan, Abschnitt "Namens-Kollisions-Check").
 */
export interface IBereitschaftszeitraum {
  _id?: string;
  Beginn: string; // ISO-Date
  Ende: string; // ISO-Date
  Pause?: number;
}

/**
 * Bereitschaftseinsatz (Wire-Format). `Beginn`/`Ende` sind reine
 * `"HH:mm"`-Uhrzeiten eines Tages-Eintrags — siehe Hinweis bei
 * `IBereitschaftszeitraum` zur bewusst fehlenden gemeinsamen Basis.
 */
export interface IBereitschaftseinsatz {
  _id?: string;
  Bereitschaftszeitraum?: string[];
  Tag: string; // ISO-Date
  Auftragsnummer: string;
  Beginn: string;
  Ende: string;
  LRE: LreType;
  PrivatKm: number;
}

/**
 * Einsatzwechseltätigkeit (Wire-Format). `Buchungstag` bleibt hier bewusst
 * `string` (ISO-Date, wie das Backend-Modell) -- der PDF-DTO
 * (`IPdfEWT`, `frontend/infrastructure/pdf/pdfDaten.ts`) sendet es
 * abweichend als zweistelligen Tages-String; diese vorbestehende Diskrepanz
 * ist dokumentiert und nicht Teil dieser Migration. `abWE`/`ab1E`/`anEE`/`beginE`/`endeE`/
 * `abEE`/`an1E`/`anWE` trugen im Frontend bereits dieselben Namen wie im
 * Backend -- kein Rename nötig, nur hier mit aufgenommen.
 */
export interface IEinsatzwechseltaetigkeit {
  _id?: string;
  Tag: string; // ISO-Date
  Buchungstag?: string; // ISO-Date
  Einsatzort?: string;
  Schicht: string;
  abWE?: string;
  ab1E?: string;
  anEE?: string;
  beginE?: string;
  endeE?: string;
  abEE?: string;
  an1E?: string;
  anWE?: string;
  berechnen?: boolean;
}

/** Einzelne Zulage innerhalb eines Nebengeld-Eintrags. */
export interface IZulage {
  Typ: string;
  Wert: number;
}

/**
 * Nebengeld (Wire-Format). `Beginn`/`Ende` sind reine `"HH:mm"`-Uhrzeiten
 * eines Tages-Eintrags — siehe Hinweis bei `IBereitschaftszeitraum` zur
 * bewusst fehlenden gemeinsamen Basis. `zulagenAnzeigeN` (abgeleitetes
 * Anzeigefeld für die Frontend-Tabellen-UI) ist bewusst nicht Teil dieses
 * Typs — existiert nur lokal im Frontend, kein Backend-Gegenstück.
 */
export interface INebengeld {
  _id?: string;
  /** null = EWT-Verknüpfung explizit entfernen (Backend übersetzt zu $unset) */
  EWT?: string | null;
  Tag: string; // ISO-Date
  Beginn: string;
  Ende: string;
  Auftragsnummer?: string;
  Zulagen: IZulage[];
}

/**
 * Persönliche Stammdaten (Teil von UserProfile, Wire-Format). Nur `Pers` und
 * `Fahrzeit` sind hier abgebildet: ihre Blattfelder sind 1:1 identisch zum
 * Frontend (keine Optionalitäts-Abweichung). `Arbeitszeit`/`VorgabenB` bleiben
 * bewusst außen vor -- das Frontend hält dafür eine eigene, vollständig
 * hydrierte Form (`IVorgabenUaZ`/`IVorgabenUvorgabenB` in
 * `core/types/IVorgabenU.ts`), die zwar dieselben Feldnamen trägt, aber
 * Felder garantiert setzt, die im Backend-Wire-Format optional sind (z.B.
 * `spaet`/`nacht`/`sonder`, `aktiv`) -- dieselbe Art bewusst nicht
 * vereinheitlichter Typ-Divergenz wie bei `Beginn`/`Ende` oben, nur diesmal
 * bei Optionalität statt Format.
 */
export interface IPers {
  Vorname: string;
  Nachname: string;
  PNummer: string;
  Telefon: string;
  Adress1: string;
  Adress2?: string;
  ErsteTkgSt: string;
  ErsteTkgStAdresse: string;
  Bundesland: string;
  Betrieb: string;
  /** Organisationseinheit als Hierarchie-Ebenen, z.B. ['I','IW','MI','N','KSL','IL','03'] */
  OE: string[];
  Gewerk: string;
  kmArbeitsort: number;
  nBhf: string;
  kmnBhf: number;
  /** Schlüssel in die Geld-Vorgaben — siehe `TB_VALUES` in `enums.ts`. */
  TB: TarifBesoldung;
  /** Grundtätigkeit des Mitarbeiters (Kopf-Feld Entgeltausgleich-Formular), z.B. "Signalmechaniker RBEG". Optional: Bestandsnutzer ohne EA-Nutzung haben es (noch) nicht gepflegt. */
  Taetigkeit?: string;
  /** Entgeltgruppe der Grundtätigkeit (Kopf-Feld Entgeltausgleich-Formular), z.B. "105". Optional, siehe `Taetigkeit`. */
  Entgeltgruppe?: string;
}

export interface IFahrzeit {
  key: string;
  text: string;
  value: string;
}

/**
 * Zeitpunkt innerhalb eines Bereitschafts-VorgabenB-Eintrags (`beginnB`/`endeB`/`beginnN`/`endeN`).
 * `Nwoche` markiert, ob dieser Punkt in die ISO-Folgewoche fällt -- optional im Wire-Format, weil
 * das Frontend (`IVorgabenUvorgabenB`, `core/types/IVorgabenU.ts`) es für `endeB`/`beginnN`/`endeN`
 * immer mitschickt, für `beginnB` (Referenzpunkt des Zeitraums, kann trivial nicht "nächste Woche"
 * sein) dagegen bewusst NIE -- dieselbe Art Optionalitäts-Divergenz wie bei `IPers`, hier aber
 * strukturell begründet statt Versehen, deshalb hier absichtlich optional statt vereinheitlicht.
 */
export interface IZeitpunktMitWoche {
  tag: number;
  zeit?: string;
  Nwoche?: boolean;
}

/**
 * Wert eines `VorgabenB`-Eintrags (Bereitschafts-Arbeitszeitvorgabe). `schichtenOverrides` bleibt
 * bewusst lose (`Record<string, unknown>`) -- das Frontend hält dafür eine stärker typisierte Form
 * (`Partial<IPerWeekdaySchicht>` je `BereitschaftSchichtTyp`), siehe `IVorgabenUvorgabenB`.
 */
export interface IVorgabeBWert {
  Name: string;
  beginnB: IZeitpunktMitWoche;
  endeB: IZeitpunktMitWoche;
  schichten?: BereitschaftSchichtTyp[];
  schichtenOverrides?: Record<string, unknown>;
  /** DEPRECATED — Fallback für alte Einträge; wird bei Migration auf `schichten: ['nacht']` gemappt. */
  nacht: boolean;
  beginnN: IZeitpunktMitWoche;
  endeN: IZeitpunktMitWoche;
  standard?: boolean;
}

export interface IVorgabeBEntry {
  key: string;
  value: IVorgabeBWert;
}

/**
 * Entgeltausgleich (Wire-Format, §6 FGrTV). `Dauer` ist eine reine
 * `"HH:mm"`-Zeitspanne (geleistete höherwertige Arbeitszeit), kein
 * `Beginn`/`Ende`-Paar wie bei Nebengeld -- siehe Hinweis bei
 * `IBereitschaftszeitraum` zur bewusst fehlenden gemeinsamen Basis.
 * `Taetigkeit`/`Entgeltgruppe` hier sind Tages-Felder (welche höherwertige
 * Tätigkeit an diesem Tag ausgeübt wurde) -- unabhängig von den
 * gleichnamigen Kopf-Feldern in `IPers` (Grundtätigkeit des Mitarbeiters).
 */
export interface IEntgeltausgleich {
  _id?: string;
  /** null = EWT-Verknüpfung explizit entfernen (Backend übersetzt zu $unset) */
  EWT?: string | null;
  Tag: string; // ISO-Date
  Dauer: string; // "HH:mm"
  Taetigkeit: string;
  Entgeltgruppe: string;
}

/**
 * Sicherer User-Wire-Ausschnitt für die Admin-Verwaltung (`GET/PUT /users`) -- NUR die Felder, die
 * das Backend tatsächlich ausliefert (Mongoose `toJSON.transform` in `User.ts` streicht Passwort,
 * Tokens, Sessions, Passkeys zur Laufzeit). Das Backend hat dafür kein eigenes DTO -- Controller
 * reichen das volle `IUser`-Document durch `sendSuccess()`, die Feldliste hier ist also der einzige
 * geprüfte Vertrag für dieses Wire-Format, nicht durch einen zweiten Backend-Typ abgesichert.
 */
export interface IUserAdminRow {
  _id: string;
  userName: string;
  email?: string;
  emailVerified?: boolean;
  role: Role;
  adminForTeamOes?: string[];
  adminForOrganizationOes?: string[];
  canEditVorgabenGeld?: boolean;
  canEditProfileTemplates?: boolean;
  canEditOwnTeamTemplatesOnly?: boolean;
  canCreateFormularVorlagen?: boolean;
  canEditFormularVorlagen?: boolean;
}
