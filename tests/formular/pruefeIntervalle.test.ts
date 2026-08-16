import { describe, expect, it } from 'bun:test';
import { pruefeIntervalle } from '../../src/formular/pruefeIntervalle';
import type { Layout, Registry } from '../../src/formular/types';

const leeresLayout: Layout = { template: '', seiten: [{ quelle: 0, bereiche: [{ tabelle: 'haupt', startY: 0, maxZeilen: 1 }], felder: {} }] };

function macheVersion(version: string, gueltigVon: string, gueltigBis: string | null) {
  return {
    version,
    gueltigVon,
    gueltigBis,
    layout: leeresLayout,
    tabellen: { haupt: { quelle: 'zeilen', hoehe: 12, spalten: [] } },
  };
}

describe('pruefeIntervalle', () => {
  it('meldet keinen Fehler bei nahtlos aneinandergrenzenden Versionen mit offener letzter Version', () => {
    const registry: Registry = {
      ez: {
        titel: 'Zulagenzettel',
        versionen: [macheVersion('v1', '2025-01-01', '2026-01-01'), macheVersion('v2', '2026-01-01', null)],
      },
    };
    expect(pruefeIntervalle(registry)).toEqual([]);
  });

  it('meldet eine Lücke zwischen zwei Versionen', () => {
    const registry: Registry = {
      ez: {
        titel: 'Zulagenzettel',
        versionen: [macheVersion('v1', '2025-01-01', '2026-01-01'), macheVersion('v2', '2026-02-01', null)],
      },
    };
    const fehler = pruefeIntervalle(registry);
    expect(fehler).toHaveLength(1);
    expect(fehler[0]).toContain('Lücke oder Überlappung');
  });

  it('meldet eine Überlappung zwischen zwei Versionen', () => {
    const registry: Registry = {
      ez: {
        titel: 'Zulagenzettel',
        versionen: [macheVersion('v1', '2025-01-01', '2026-02-01'), macheVersion('v2', '2026-01-01', null)],
      },
    };
    const fehler = pruefeIntervalle(registry);
    expect(fehler).toHaveLength(1);
    expect(fehler[0]).toContain('Lücke oder Überlappung');
  });

  it('meldet, wenn die letzte Version nicht offen ist', () => {
    const registry: Registry = {
      ez: {
        titel: 'Zulagenzettel',
        versionen: [macheVersion('v1', '2025-01-01', '2026-01-01')],
      },
    };
    const fehler = pruefeIntervalle(registry);
    expect(fehler).toHaveLength(1);
    expect(fehler[0]).toContain('ist nicht offen');
  });

  it('prüft mehrere Formulare unabhängig voneinander', () => {
    const registry: Registry = {
      ez: {
        titel: 'Zulagenzettel',
        versionen: [macheVersion('v1', '2025-01-01', null)],
      },
      ewt: {
        titel: 'EWT',
        versionen: [macheVersion('v1', '2025-01-01', '2026-01-01')],
      },
    };
    const fehler = pruefeIntervalle(registry);
    expect(fehler).toHaveLength(1);
    expect(fehler[0]).toContain('ewt:');
  });
});
