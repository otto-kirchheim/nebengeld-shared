import { describe, expect, it } from 'bun:test';
import { resolve } from '../../src/formular/resolve';
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

describe('resolve', () => {
  const registry: Registry = {
    ez: {
      titel: 'Zulagenzettel',
      versionen: [
        macheVersion('v1', '2025-01-01', '2026-01-01'),
        macheVersion('v2', '2026-01-01', null),
      ],
    },
  };

  it('löst die Version vor dem Stichtag der zweiten Version aus der ersten Version auf', () => {
    expect(resolve(registry, 'ez', '2025-06-15').version).toBe('v1');
  });

  it('löst am inklusiven gueltigVon-Stichtag bereits die neue Version auf', () => {
    expect(resolve(registry, 'ez', '2026-01-01').version).toBe('v2');
  });

  it('löst am exklusiven gueltigBis-Stichtag noch NICHT die neue Version, sondern die vorherige auf', () => {
    expect(resolve(registry, 'ez', '2025-12-31').version).toBe('v1');
  });

  it('löst innerhalb einer offenen (gueltigBis: null) Version auch weit in der Zukunft auf', () => {
    expect(resolve(registry, 'ez', '2099-01-01').version).toBe('v2');
  });

  it('wirft bei unbekanntem Formular', () => {
    expect(() => resolve(registry, 'unbekannt', '2026-01-01')).toThrow('Unbekanntes Formular: unbekannt');
  });

  it('wirft, wenn kein Stichtag in eine Version fällt (vor der ersten gueltigVon)', () => {
    expect(() => resolve(registry, 'ez', '2024-01-01')).toThrow('Keine gültige Version für ez am 2024-01-01');
  });
});
