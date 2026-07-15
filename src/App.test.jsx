import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './main.jsx';

const originalScrollIntoView = Element.prototype.scrollIntoView;

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
        blackHole: { value: `https://www.wikidata.org/wiki/Q${index + 1000}` },
        blackHoleLabel: { value: name },
        typeLabel: { value: type },
        mass: { value: String(mass) },
        distance: { value: String(distance) },
        constellationLabel: { value: constellation },
      })),
    },
  };
}

function fallbackResponse(rows = catalog) {
  return rows.map(([name, type, mass, distance, constellation], index) => ({
    id: index === 0
      ? 'sgr-a-star'
      : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
    type,
    mass,
    distance,
    constellation,
  }));
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
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
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

  it('cycles table sorting through ascending, descending, and off', async () => {
    await renderDashboard();

    const nameSortButton = screen.getByRole('button', { name: 'Sort Name ascending' });
    const nameHeader = nameSortButton.closest('th');

    fireEvent.click(nameSortButton);
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(nameSortButton).toHaveAccessibleName('Sort Name descending');

    fireEvent.click(nameSortButton);
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    expect(nameSortButton).toHaveAccessibleName('Clear Name sorting');

    fireEvent.click(nameSortButton);
    expect(nameHeader).not.toHaveAttribute('aria-sort');
    expect(nameSortButton).toHaveAccessibleName('Sort Name ascending');
  });

  it('sorts numeric mass values in ascending order', async () => {
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Sort Mass ascending' }));
    const firstObjectLink = screen.getAllByRole('link', { name: /view details/i })[0];

    expect(firstObjectLink).toHaveTextContent('GRO J1655-40');
    expect(firstObjectLink.closest('tr')).toHaveTextContent('6.3 M☉');
  });

  it('filters rows by the minimum mass slider', async () => {
    await renderDashboard();

    fireEvent.change(screen.getByRole('slider', { name: /minimum mass/i }), {
      target: { value: '9' },
    });

    expect(screen.getByText('Sagittarius A*')).toBeInTheDocument();
    expect(screen.getByText('M87*')).toBeInTheDocument();
    expect(screen.queryByText('Cygnus X-1')).not.toBeInTheDocument();
    expect(screen.queryByText('HLX-1')).not.toBeInTheDocument();
  });

  it('moves the mass slider through real catalog mass stops', async () => {
    await renderDashboard();

    fireEvent.change(screen.getByRole('slider', { name: /minimum mass/i }), {
      target: { value: '4' },
    });

    expect(screen.getByLabelText('Current minimum mass')).toHaveTextContent('10.9 M☉');
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
    fireEvent.change(screen.getByRole('slider', { name: /minimum mass/i }), {
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
    expect(
      screen.getAllByRole('link', { name: /view details/i })
        .map((link) => link.querySelector('strong')?.textContent),
    ).toEqual([
      'M87*',
      'TON 618',
      'Sagittarius A*',
      'NGC 1277',
    ]);
    expect(rows.every(([, type]) => type === 'Supermassive')).toBe(true);
    expect(screen.queryByText('Black hole')).not.toBeInTheDocument();
  });
});

describe('routing, resilience, and accessibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
  });

  it('loads cached fallback rows and reports that live data is unavailable', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fallbackResponse(),
      });

    render(<App />);

    expect(await screen.findByText(/Showing cached sample data/i)).toBeInTheDocument();
    expect(visibleBodyRows()).toHaveLength(12);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses cached fallback rows when the live API payload is malformed', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: 'shape' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fallbackResponse(),
      });

    render(<App />);

    expect(await screen.findByText(/Showing cached sample data/i)).toBeInTheDocument();
    expect(visibleBodyRows()).toHaveLength(12);
  });

  it('shows a stable error state when both live and cached data fail', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ ok: false });

    render(<App />);

    expect(await screen.findByText(/data could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view details/i })).not.toBeInTheDocument();
  });

  it('normalizes malformed numeric fields instead of rendering NaN or Infinity', async () => {
    const response = wikidataResponse(catalog);
    response.results.bindings[0].mass.value = 'Infinity';
    response.results.bindings[0].distance.value = '-400';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => response,
    });

    render(<App />);
    const row = (await screen.findByText('Sagittarius A*')).closest('tr');

    expect(within(row).getAllByRole('cell')[2]).toHaveTextContent('Unknown');
    expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('Unknown');
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it('replaces an untrusted API source URL with a safe Wikidata link', async () => {
    const response = wikidataResponse(catalog);
    response.results.bindings[0].blackHole.value = 'javascript:alert(1)';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => response,
    });

    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: /Sagittarius A.*view details/i }));

    const sourceLink = await screen.findByRole('link', {
      name: /View Sagittarius A\* on Wikidata in a new tab/i,
    });
    expect(sourceLink).toHaveAttribute(
      'href',
      'https://www.wikidata.org/w/index.php?search=Sagittarius%20A*',
    );
    expect(sourceLink.getAttribute('href')).not.toMatch(/^javascript:/i);
  });

  it('renders a unique detail route with extra information and a source link', async () => {
    window.history.replaceState({}, '', '/black-holes/sagittarius-a');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => wikidataResponse(catalog),
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sagittarius A*' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event Horizon' })).toBeInTheDocument();
    expect(screen.getByText('Sagittarius constellation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Sagittarius A\* on Wikidata/i }))
      .toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q1000');
  });

  it('shows a not-found view for an unknown direct route', async () => {
    window.history.replaceState({}, '', '/black-holes/not-a-real-object');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => wikidataResponse(catalog),
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Black hole not found' }))
      .toBeInTheDocument();
    expect(screen.getByText(/not-a-real-object/)).toBeInTheDocument();
  });

  it('reports and toggles the current motion state accessibly', async () => {
    await renderDashboard();
    const motionButton = screen.getByRole('button', { name: 'Motion: On' });

    expect(motionButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(motionButton);
    expect(motionButton).toHaveAccessibleName('Motion: Off');
    expect(motionButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('clamps the numeric minimum-mass input to valid catalog bounds', async () => {
    await renderDashboard();
    const massInput = screen.getByRole('spinbutton', { name: /minimum mass/i });

    fireEvent.change(massInput, { target: { value: '-100' } });
    expect(massInput).toHaveValue(0);

    fireEvent.change(massInput, { target: { value: '999999999999' } });
    expect(massInput).toHaveValue(66_000_000_000);
    expect(visibleBodyRows()).toHaveLength(1);
  });

  it('announces an empty result and restores rows with Reset filters', async () => {
    await renderDashboard();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'definitely-not-a-black-hole' },
    });

    expect(
      screen.getByRole('status', { name: 'No matching black holes' }),
    ).toHaveTextContent(/No black holes match/i);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(visibleBodyRows()).toHaveLength(12);
    expect(
      screen.queryByRole('status', { name: 'No matching black holes' }),
    ).not.toBeInTheDocument();
  });

  it('provides chart summaries and updates the scatter scale description', async () => {
    await renderDashboard();

    expect(screen.getByRole('img', { name: /Catalog mix:/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /shown on a log scale/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Linear' }));
    expect(screen.getByRole('img', { name: /shown on a linear scale/i })).toBeInTheDocument();
  });

  it('groups fixed catalog charts separately from mass-filtered results', async () => {
    await renderDashboard();

    const overview = screen.getByRole('region', { name: 'What stands out' });
    const filteredCatalog = screen.getByRole('region', { name: 'Filtered catalog' });

    expect(within(overview).getByRole('img', { name: /Catalog mix:/i }))
      .toBeInTheDocument();
    expect(within(overview).getByRole('img', { name: /12 black holes/i }))
      .toBeInTheDocument();
    expect(within(overview).queryByRole('slider')).not.toBeInTheDocument();

    expect(within(filteredCatalog).getByRole('slider')).toBeInTheDocument();
    expect(within(filteredCatalog).getByRole('table')).toBeInTheDocument();
    expect(within(filteredCatalog).getByText('Matching Objects'))
      .toBeInTheDocument();
  });

  it('provides keyboard and screen-reader context for the results table', async () => {
    await renderDashboard();

    expect(document.querySelector('main')).toHaveAttribute('tabindex', '-1');

    const tableRegion = screen.getByRole('region', {
      name: 'Black hole results table',
    });
    expect(tableRegion).toHaveAttribute('tabindex', '0');
    expect(within(tableRegion).getByText('Black holes matching the current filters'))
      .toBeInTheDocument();

    within(tableRegion).getAllByRole('columnheader').forEach((header) => {
      expect(header).toHaveAttribute('scope', 'col');
    });
  });

  it('paginates catalogs larger than one page without losing rows', async () => {
    const largeCatalog = Array.from({ length: 25 }, (_, index) => [
      `Catalog Object ${String(index + 1).padStart(2, '0')}`,
      'stellar black hole',
      index + 1,
      (index + 1) * 100,
      'Test Constellation',
    ]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => wikidataResponse(largeCatalog),
    });

    render(<App />);
    await screen.findByText('Catalog Object 01');
    expect(visibleBodyRows()).toHaveLength(20);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(visibleBodyRows()).toHaveLength(5);
    expect(screen.getByText('Catalog Object 25')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('jumps to detail and back to the table when navigating from the catalog', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await renderDashboard();

    fireEvent.click(screen.getByRole('link', { name: /Sagittarius A.*view details/i }));
    expect(await screen.findByRole('heading', { name: 'Sagittarius A*' })).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });

    scrollIntoView.mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'Back to dashboard' }));
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});
