// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders the label under the given testID', async () => {
    const { getByTestId } = await render(
      <Badge testID="session-payment-status-captured" label="Captured" variant="success" />,
    );
    expect(getByTestId('session-payment-status-captured')).toHaveTextContent('Captured');
  });

  it('has no testID unless one is given', async () => {
    const { queryByTestId, getByText } = await render(<Badge label="Pending" />);
    expect(getByText('Pending')).toBeTruthy();
    expect(queryByTestId('session-payment-status-pending')).toBeNull();
  });
});
