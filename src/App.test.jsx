import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './main.jsx';

const catalog = [
  ['Sagittarius A*', 'Supermassive', 4_020_000, 26_000, 'Sagittarius'],
  ['M87*', 'Supermassive', 6_500_000_000, 55_000_000, 'Virgo'],
  ['Cygnus X-1', 'Stellar', 21, 7_240, 'Cygnus'],
  ['V404 Cygni', 'Stellar', 9, 7_800, 'Cygnus'],
  ['GRO J1655-40', 'Stellar', 6.3, 11_000, 'Scorpius'],
  ['A0620-00', 'Stellar', 6.6, 3_300, 'Monoceros'],
  ['NGC 1277', 'Supermassive', 17_000_000_000, 220_000_000, 'Perseus'],
  ['TON 618', 'Supermassive', 66_000_000_000, 10_400_000_000, 'Canes Venatici'],
  ['HLX-1', 'Intermediate', 20_000, 290_000_000, 'Phoenix'],
  ['ESO 243-49 HLX-1', 'Intermediate', 50_000, 290_000_000, 'Phoenix'],
  ['IC 10 X-1', 'Stellar', 24, 2_200_000, 'Cassiopeia'],
  ['LMC X-1', 'Stellar', 10.9, 163_000, 'Dorado'],
];

const duplicateLiveCatalog = [
  ['M87*', 'black hole', 6_500_000_000, 55_000_000, 'Virgo'],
  ['M87*', 'supermassive black hole', 6_500_000_000, 55_000_000, 'Virgo'],
  ['TON 618', 'black hole', 66_000_000_000, 10_400_000_000, 'Canes Venatici'],
  ['TON 618', 'supermassive black hole', 66_000_000_000, 10_400_000_000, 'Canes Venatici'],
  ['Cygnus X-1', 'black hole', 21, 7_240, 'Cygnus'],
  ['Cygnus X-1', 'stellar black hole', 21, 7_240, 'Cygnus'],
  ['V404 Cygni', 'stellar black hole', 9, 7_800, 'Cygnus'],
  ['A0620-00', 'stellar black hole', 6.6, 3_300, 'Monoceros'],
  ['HLX-1', 'intermediate-mass black hole', 20_000, 290_000_000, 'Phoenix'],
  ['ESO 243-49 HLX-1', 'intermediate-mass black hole', 50_000, 290_000_000, 'Phoenix'],
  ['Sagittarius A*', 'black hole', 4_020_000, 26_000, 'Sagittarius'],
  ['NGC 1277', 'supermassive black hole', 17_000_000_000, 220_000_000, 'Perseus'],
  ['IC 10 X-1', 'stellar black hole', 24, 2_200_000, 'Cassiopeia'],
  ['LMC X-1', 'stellar black hole', 10.9, 163_000, 'Dorado'],
];

function wikidataResponse(rows) {
  return {
    results: {
      bindings: rows.map(([name, type, mass, distance, constellation], index) => ({
        blackHole: { value: `https://example.test/black-hole/${index}` },
        blackHoleLabel: { value: name },
        typeLabel: { value: type },
        mass: { value: String(mass) },
        distance: { value: String(distance) },
        constellationLabel: { value: constellation },
      })),
    },
  };
}

async function renderDashboard(rows = catalog) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => wikidataResponse(rows),
  });

  render(<App />);
  await screen.findByText('Sagittarius A*');
}

function visibleBodyRows() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
}

describe('dashboard filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads API rows into the table before filters are applied', async () => {
    await renderDashboard();

    expect(visibleBodyRows()).toHaveLength(12);
    expect(screen.getByText('Cygnus X-1')).toBeInTheDocument();
    expect(screen.getByText('TON 618')).toBeInTheDocument();
  });

  it('filters table rows by the search text as the user types', async () => {
    await renderDashboard();

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Cygnus' },
    });

    expect(visibleBodyRows()).toHaveLength(2);
    expect(screen.getByText('Cygnus X-1')).toBeInTheDocument();
    expect(screen.getByText('V404 Cygni')).toBeInTheDocument();
    expect(screen.queryByText('M87*')).not.toBeInTheDocument();
  });

  it('filters rows by the selected classification', async () => {
    await renderDashboard();

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Intermediate' },
    });

    const rows = visibleBodyRows();
    expect(rows).toHaveLength(2);
    expect(screen.getByText('HLX-1')).toBeInTheDocument();
    expect(screen.getByText('ESO 243-49 HLX-1')).toBeInTheDocument();
    expect(screen.queryByText('Sagittarius A*')).not.toBeInTheDocument();
  });

  it('filters rows by the minimum mass slider', async () => {
    await renderDashboard();

    fireEvent.change(screen.getByLabelText(/minimum mass/i), {
      target: { value: '9' },
    });

    expect(screen.getByText('Sagittarius A*')).toBeInTheDocument();
    expect(screen.getByText('M87*')).toBeInTheDocument();
    expect(screen.queryByText('Cygnus X-1')).not.toBeInTheDocument();
    expect(screen.queryByText('HLX-1')).not.toBeInTheDocument();
  });

  it('moves the mass slider through real catalog mass stops', async () => {
    await renderDashboard();

    fireEvent.change(screen.getByLabelText(/minimum mass/i), {
      target: { value: '4' },
    });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('10.9 M solar');
    expect(screen.getByText('Cygnus X-1')).toBeInTheDocument();
    expect(screen.queryByText('V404 Cygni')).not.toBeInTheDocument();
  });

  it('applies search, classification, and mass filters at the same time', async () => {
    await renderDashboard();

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Cygnus' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Stellar' },
    });
    fireEvent.change(screen.getByLabelText(/minimum mass/i), {
      target: { value: '4' },
    });

    expect(visibleBodyRows()).toHaveLength(1);
    expect(screen.getByText('Cygnus X-1')).toBeInTheDocument();
    expect(screen.queryByText('V404 Cygni')).not.toBeInTheDocument();
  });

  it('keeps visible rows and catalog count aligned when live API rows contain duplicate objects and generic types', async () => {
    await renderDashboard(duplicateLiveCatalog);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Supermassive' },
    });

    const rows = visibleBodyRows();
    expect(rows).toHaveLength(4);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(rows.map(([name]) => name)).toEqual([
      'M87*',
      'TON 618',
      'Sagittarius A*',
      'NGC 1277',
    ]);
    expect(rows.every(([, type]) => type === 'Supermassive')).toBe(true);
    expect(screen.queryByText('Black hole')).not.toBeInTheDocument();
  });
});
