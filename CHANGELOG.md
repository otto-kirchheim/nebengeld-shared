# Changelog (Shared)

Dieses Changelog dokumentiert Aenderungen am Shared-Paket `@otto-kirchheim/nebengeld-shared`.

## 2026-10-29 (4)

### feat (PDF-Formate als Muster)

- `FormatName` entfaellt; `Feld`/`Spalte`/`SonderZeileZelle.format` sind jetzt `Format` (Freitext).
- Neu `formular/format.ts`: `pruefeFormat` (Art `schluessel`/`zahl`/`datum` oder Fehlermeldung),
  `zerlegeZahlenmuster` (Tausendertrenner `.` oder Leerzeichen, Gruppengroesse aus dem Muster), `datumTokens`, `findeFormatPlatzhalter`, `sammleFormatFehler`,
  `FORMAT_SCHLUESSEL` (`@liste`, `@grossbuchstaben`, `@jaNein`, `@oe`) und `ALTE_FORMATE`
  (alter Name -> Muster, fuer Migration und Fehlermeldung).

## 2026-10-28 (3)

### feat (`IUserAdminRow.adminForStuetzpunkte`)

- Neues optionales Feld `adminForStuetzpunkte?: string[]` im Admin-Wire-Typ: zusaetzliche
  Stuetzpunkt-Einschraenkung (Abgleich gegen `Pers.ErsteTkgSt`) fuer Team-Admins und den
  Team-Bereich von Org-Admins.

## 2026-10-27 (2)

### feat (`scripts/deploy.sh --force`)

- Neue Option `--force`: releast auch ohne Aenderung unter `src/` (z. B. Dependency-/Skript-Updates), damit frontend/backend einen `main`-Stand statt eines dev-Pins nutzen. Ohne `--force` unveraendert: kein Release ohne `src/`-Aenderung. Root-`release.sh` fragt in Schritt 2 danach.

## 2026-10-27 (1)

### chore (Dependency-Update)

- `@types/bun` 1.4.0 -> 1.4.4 (nur devDependency, `bun.lock` aktualisiert).
- Verifiziert: `typecheck` und `test` (11 pass) gruen.
