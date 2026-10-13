// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The driver's invoices, invoice detail and billing address screens, rendered
// with the real English catalogue and a mocked API.

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPush = jest.fn();
const mockShare = jest.fn();
const mockToast = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(statusCode: number, responseBody: unknown) {
      super('api error');
      this.status = statusCode;
      this.body = responseBody;
    }
    get code(): string | undefined {
      return (this.body as { code?: string } | null)?.code;
    }
    get isServerDown(): boolean {
      return this.status === 0 || this.status >= 500;
    }
  }
  return {
    ApiError,
    getApiErrorFieldDetails: () => ({}),
    api: {
      get: (...args: unknown[]) => mockGet(...args),
      patch: (...args: unknown[]) => mockPatch(...args),
    },
  };
});

jest.mock('@/lib/invoice-pdf', () => ({
  shareInvoicePdf: (...args: unknown[]) => mockShare(...args),
}));

jest.mock('@/lib/auth', () => ({
  useAuth: (select: (s: { driver: { firstName: string; lastName: string } }) => unknown) =>
    select({ driver: { firstName: 'Jane', lastName: 'Doe' } }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockParams.current,
}));

jest.mock('@/components/icons', () => ({ FileText: (): null => null }));

// The ui barrel pulls in reanimated (no native worklets under jest). Real
// primitives where they render plain views, light stand-ins for the rest.
jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { Text } =
    jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  const Pressable = ({
    title,
    testID,
    onPress,
  }: {
    title: string;
    testID?: string;
    onPress?: () => void;
  }) =>
    React.createElement(
      RN.Pressable,
      { testID, onPress, accessibilityRole: 'button' },
      React.createElement(Text, null, title),
    );
  return {
    Text,
    Card: jest.requireActual<typeof import('@/components/ui/Card')>('@/components/ui/Card').Card,
    Badge:
      jest.requireActual<typeof import('@/components/ui/Badge')>('@/components/ui/Badge').Badge,
    Spinner:
      jest.requireActual<typeof import('@/components/ui/Spinner')>('@/components/ui/Spinner')
        .Spinner,
    Screen: Box,
    BackButton: () => null,
    EmptyState: ({ title }: { title: string }) => React.createElement(Text, null, title),
    Button: Pressable,
    ListRow: Pressable,
    Field: ({
      testID,
      value,
      onChangeText,
    }: {
      testID?: string;
      value: string;
      onChangeText: (v: string) => void;
    }) => React.createElement(RN.TextInput, { testID, value, onChangeText }),
    useToast: () => ({ show: mockToast }),
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import { ApiError } from '@/lib/api';
import InvoicesScreen from '../../../app/(tabs)/account/invoices/index';
import InvoiceDetailScreen from '../../../app/(tabs)/account/invoices/[id]';
import BillingAddressScreen from '../../../app/(tabs)/account/billing-address';
import type { PortalInvoice, PortalInvoiceDetail } from '@/lib/invoices';

const ROW: PortalInvoice = {
  id: 'inv_1',
  invoiceNumber: 'INV-2026-0001',
  kind: 'invoice',
  status: 'issued',
  viaFleetName: 'Acme',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  creditedInvoiceId: null,
  issuedAt: '2026-10-01T08:00:00.000Z',
  dueAt: '2026-10-31T08:00:00.000Z',
  paidAt: null,
  currency: 'EUR',
  subtotalCents: 1000,
  taxCents: 190,
  totalCents: 1190,
  createdAt: '2026-10-01T08:00:00.000Z',
};

const DETAIL: PortalInvoiceDetail = {
  ...ROW,
  billTo: { name: 'Jane Doe', street: 'Main St 1', zip: '10115', city: 'Berlin' },
  creditReason: null,
  lineItems: [
    {
      id: 7,
      sessionId: 'ses_1',
      description: 'Charging session',
      quantity: '1',
      unitPriceCents: 1000,
      totalCents: 1000,
      taxCents: 190,
      taxRate: '0.19',
      kind: 'session',
      sessionDate: '2026-09-12',
      energyWh: 12_500,
      stationName: 'Main Site CS-1',
    },
  ],
  taxBreakdown: [{ taxRate: 0.19, netCents: 1000, taxCents: 190, grossCents: 1190 }],
  creditedInvoice: null,
  creditNote: { id: 'inv_2', invoiceNumber: 'CN-2026-0001' },
};

const EMPTY_ADDRESS = {
  billingName: null,
  billingStreet: null,
  billingCity: null,
  billingState: null,
  billingZip: null,
  billingCountry: null,
};

let me: Record<string, unknown> = {};

const clients: QueryClient[] = [];

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = {};
  me = {
    billing: { mode: 'account', fleetName: 'Acme', invoicedTo: 'member' },
    billingAddress: EMPTY_ADDRESS,
  };
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/portal/invoices?page=1&limit=20') {
      return Promise.resolve({ data: [ROW], total: 2 });
    }
    if (path === '/v1/portal/invoices?page=2&limit=20') {
      return Promise.resolve({
        data: [{ ...ROW, id: 'inv_0', invoiceNumber: 'INV-0' }],
        total: 2,
      });
    }
    if (path === '/v1/portal/invoices/inv_1') return Promise.resolve(DETAIL);
    if (path === '/v1/portal/invoices/missing') {
      return Promise.reject(new ApiError(404, { code: 'INVOICE_NOT_FOUND' }));
    }
    if (path === '/v1/portal/auth/me') return Promise.resolve(me);
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
});

describe('Invoices screen', () => {
  it('lists the invoices with the fleet, status and total, and pages on', async () => {
    const screen = await renderWithQuery(<InvoicesScreen />);
    expect(await screen.findByText('Invoice INV-2026-0001')).toBeTruthy();
    expect(screen.getByText('Via Acme')).toBeTruthy();
    expect(screen.getByText('Issued')).toBeTruthy();
    expect(screen.getByTestId('invoice-row-total-inv_1')).toHaveTextContent('€11.90');

    await fireEvent.press(screen.getByTestId('invoices-load-more'));
    expect(await screen.findByText('Invoice INV-0')).toBeTruthy();
    expect(screen.queryByTestId('invoices-load-more')).toBeNull();
  });

  it('opens an invoice', async () => {
    const screen = await renderWithQuery(<InvoicesScreen />);
    await fireEvent.press(await screen.findByTestId('invoice-row-inv_1'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/account/invoices/[id]',
      params: { id: 'inv_1' },
    });
  });

  it('says when there are no invoices', async () => {
    mockGet.mockResolvedValueOnce({ data: [], total: 0 });
    const screen = await renderWithQuery(<InvoicesScreen />);
    expect(await screen.findByText('No invoices yet.')).toBeTruthy();
  });
});

describe('Invoice detail screen', () => {
  it('shows the invoice as printed and shares its PDF', async () => {
    mockParams.current = { id: 'inv_1' };
    mockShare.mockResolvedValue(undefined);
    const screen = await renderWithQuery(<InvoiceDetailScreen />);

    expect(await screen.findByText('INV-2026-0001')).toBeTruthy();
    expect(screen.getByText('Via Acme')).toBeTruthy();
    expect(screen.getByText('Sep 1, 2026 - Sep 30, 2026')).toBeTruthy();
    expect(screen.getByText('10115 Berlin')).toBeTruthy();
    expect(screen.getByText('Sep 12, 2026 · Main Site CS-1 · 12.50 kWh')).toBeTruthy();
    expect(screen.getByText('Tax (19%)')).toBeTruthy();
    expect(screen.getByTestId('invoice-total-value')).toHaveTextContent('€11.90');

    await fireEvent.press(screen.getByTestId('invoice-credit-note-link'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/account/invoices/[id]',
      params: { id: 'inv_2' },
    });

    await fireEvent.press(screen.getByTestId('invoice-share-pdf'));
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith(DETAIL));
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('toasts when the PDF cannot be shared', async () => {
    mockParams.current = { id: 'inv_1' };
    mockShare.mockRejectedValue(new Error('UnableToDownload'));
    const screen = await renderWithQuery(<InvoiceDetailScreen />);
    await fireEvent.press(await screen.findByTestId('invoice-share-pdf'));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        'Could not download the PDF. Please try again.',
        'error',
      ),
    );
  });

  it('says an unknown invoice was not found', async () => {
    mockParams.current = { id: 'missing' };
    const screen = await renderWithQuery(<InvoiceDetailScreen />);
    expect(await screen.findByText('Invoice not found.')).toBeTruthy();
  });
});

describe('Billing address screen', () => {
  it('nudges a member-billed driver without an address and saves blank fields as null', async () => {
    mockPatch.mockResolvedValue({});
    const screen = await renderWithQuery(<BillingAddressScreen />);
    expect(await screen.findByTestId('billing-address-nudge')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('billing-address-billingStreet'), ' Main St 1 ');
    await fireEvent.changeText(screen.getByTestId('billing-address-billingCity'), 'Berlin');
    await fireEvent.press(screen.getByTestId('billing-address-save'));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/v1/portal/driver/billing-address', {
        ...EMPTY_ADDRESS,
        billingStreet: 'Main St 1',
        billingCity: 'Berlin',
      }),
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith('Billing address saved.', 'success'),
    );
  });

  it('shows no nudge when the fleet itself is invoiced', async () => {
    me = { billing: { mode: 'account', fleetName: 'Acme', invoicedTo: 'fleet' } };
    const screen = await renderWithQuery(<BillingAddressScreen />);
    expect(await screen.findByTestId('billing-address-billingStreet')).toBeTruthy();
    expect(screen.queryByTestId('billing-address-nudge')).toBeNull();
  });
});
