// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { billToLines, invoicePdfFileName, invoiceStatusVariant } from '@/lib/invoices';
import {
  isBillingAddressEmpty,
  toBillingAddressBody,
  toBillingAddressForm,
} from '@/lib/billing-address';

describe('invoiceStatusVariant', () => {
  it('maps each status to a badge variant', () => {
    expect(invoiceStatusVariant('paid')).toBe('success');
    expect(invoiceStatusVariant('issued')).toBe('info');
    expect(invoiceStatusVariant('credited')).toBe('secondary');
    expect(invoiceStatusVariant('something_new')).toBe('secondary');
  });
});

describe('billToLines', () => {
  it('prints name, street, city line, country and email, skipping blanks', () => {
    expect(
      billToLines({
        name: 'Jane Doe',
        street: ' Main St 1 ',
        zip: '10115',
        city: 'Berlin',
        state: '',
        country: 'Germany',
        email: 'jane@example.com',
        taxId: 42,
      }),
    ).toEqual(['Jane Doe', 'Main St 1', '10115 Berlin', 'Germany', 'jane@example.com']);
  });

  it('is empty without a bill-to block', () => {
    expect(billToLines(null)).toEqual([]);
    expect(billToLines(undefined)).toEqual([]);
  });
});

describe('invoicePdfFileName', () => {
  it('keeps a plain invoice number', () => {
    expect(invoicePdfFileName('INV-2026-0001')).toBe('INV-2026-0001.pdf');
  });

  it('replaces path and other unsafe characters', () => {
    expect(invoicePdfFileName('../a/b c')).toBe('_a_b_c.pdf');
    expect(invoicePdfFileName('')).toBe('invoice.pdf');
  });
});

describe('billing address form', () => {
  const stored = {
    billingName: null,
    billingStreet: 'Main St 1',
    billingCity: 'Berlin',
    billingState: null,
    billingZip: '10115',
    billingCountry: 'Germany',
  };

  it('fills unset fields with empty strings', () => {
    expect(toBillingAddressForm(stored).billingName).toBe('');
    expect(toBillingAddressForm(undefined).billingStreet).toBe('');
  });

  it('trims values and sends a blank field as null', () => {
    const form = { ...toBillingAddressForm(stored), billingName: '  Jane  ', billingCity: '  ' };
    expect(toBillingAddressBody(form)).toEqual({
      ...stored,
      billingName: 'Jane',
      billingCity: null,
    });
  });

  it('treats an address with only a name as empty', () => {
    expect(isBillingAddressEmpty(undefined)).toBe(true);
    expect(
      isBillingAddressEmpty({
        billingName: 'Jane',
        billingStreet: null,
        billingCity: null,
        billingState: null,
        billingZip: null,
        billingCountry: null,
      }),
    ).toBe(true);
    expect(isBillingAddressEmpty(stored)).toBe(false);
  });
});
