// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The ui barrel pulls in reanimated (no native worklets under jest). Load only
// the primitives this component renders.
jest.mock('@/components/ui', () => ({
  Text: jest.requireActual('@/components/ui/Text').Text,
  StatusBadge: jest.requireActual('@/components/ui/StatusBadge').StatusBadge,
}));

import React from 'react';
import { render, within } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { ConnectorTile, type ConnectorTileConnector } from '@/components/ConnectorTile';

beforeAll(async () => {
  await initTestI18n();
});

async function renderTile(connectors: ConnectorTileConnector[]) {
  return render(
    <ConnectorTile
      testID="tile"
      connectors={connectors}
      status="available"
      port={1}
      selected={false}
      onPress={jest.fn()}
    />,
  );
}

describe('ConnectorTile', () => {
  it('shows one connector line with its face, power and current', async () => {
    const screen = await renderTile([
      { connectorId: 1, connectorType: 'Type2', maxPowerKw: 22, maxCurrentAmps: 32 },
    ]);
    const lines = screen.getAllByTestId('connector-tile-line');
    expect(lines).toHaveLength(1);
    const line = within(lines[0]!);
    expect(line.getByText('Type 2')).toBeTruthy();
    expect(line.getByText(/22.0 kW \/ 32A/)).toBeTruthy();
    expect(line.getByTestId('connector-face-type2', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Port 1')).toBeTruthy();
  });

  it('shows one line per connector of two types, in connector id order', async () => {
    const screen = await renderTile([
      { connectorId: 2, connectorType: 'CHAdeMO', maxPowerKw: 50 },
      { connectorId: 1, connectorType: 'CCS1', maxPowerKw: 150, maxCurrentAmps: 200 },
    ]);
    const [first, second] = screen.getAllByTestId('connector-tile-line');
    expect(within(first!).getByText('CCS1')).toBeTruthy();
    expect(within(first!).getByText(/150.0 kW \/ 200A/)).toBeTruthy();
    expect(
      within(first!).getByTestId('connector-face-ccs1', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(within(second!).getByText('CHAdeMO')).toBeTruthy();
    expect(within(second!).getByText(/50.0 kW/)).toBeTruthy();
    expect(screen.queryByText('CCS1, CHAdeMO')).toBeNull();
    // One EVSE status for the tile.
    expect(screen.getAllByText('Available')).toHaveLength(1);
  });

  it('gives two connectors of the same type a line each and names Type 1 J1772', async () => {
    const screen = await renderTile([
      { connectorId: 1, connectorType: 'Type1', maxPowerKw: 7.2 },
      { connectorId: 2, connectorType: 'cType1', maxPowerKw: 11 },
    ]);
    expect(screen.getAllByTestId('connector-tile-line')).toHaveLength(2);
    expect(screen.getAllByText('J1772')).toHaveLength(2);
  });

  it('draws a neutral face and Other for an unknown type', async () => {
    const screen = await renderTile([{ connectorId: 1, connectorType: null, maxPowerKw: null }]);
    expect(
      screen.getByTestId('connector-face-neutral', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('names its port, status and connectors and reports its state to screen readers', async () => {
    const screen = await render(
      <ConnectorTile
        testID="tile"
        connectors={[{ connectorId: 1, connectorType: 'CCS1', maxPowerKw: 50 }]}
        status="available"
        port={2}
        selected
        onPress={jest.fn()}
      />,
    );
    const tile = screen.getByTestId('tile');
    expect(tile.props.accessibilityRole).toBe('button');
    expect(tile.props.accessibilityLabel).toBe('Port 2, Available, CCS1');
    expect(tile.props.accessibilityState).toEqual({ selected: true, disabled: false });
  });

  it('reports a tile that cannot be picked as disabled', async () => {
    const screen = await render(
      <ConnectorTile
        testID="tile"
        connectors={[{ connectorId: 1, connectorType: 'Type2', maxPowerKw: 22 }]}
        status="faulted"
        port={1}
        selected={false}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByTestId('tile').props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
  });
});
