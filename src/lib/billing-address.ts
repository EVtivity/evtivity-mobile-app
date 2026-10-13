// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { TextInputProps } from 'react-native';

/** The bill-to block of the member invoices a fleet addresses to the driver (GET /v1/portal/auth/me). */
export interface DriverBillingAddress {
  billingName: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  billingCountry: string | null;
}

export type BillingAddressField = keyof DriverBillingAddress;

/** The form fields in display order, with the column widths of the API and the i18n label key. */
export const BILLING_ADDRESS_FIELDS: readonly {
  key: BillingAddressField;
  label: string;
  maxLength: number;
  autoComplete: NonNullable<TextInputProps['autoComplete']>;
}[] = [
  { key: 'billingName', label: 'name', maxLength: 255, autoComplete: 'name' },
  { key: 'billingStreet', label: 'street', maxLength: 255, autoComplete: 'street-address' },
  { key: 'billingZip', label: 'zip', maxLength: 20, autoComplete: 'postal-code' },
  { key: 'billingCity', label: 'city', maxLength: 100, autoComplete: 'postal-address-locality' },
  { key: 'billingState', label: 'state', maxLength: 100, autoComplete: 'postal-address-region' },
  {
    key: 'billingCountry',
    label: 'country',
    maxLength: 100,
    autoComplete: 'postal-address-country',
  },
];

export type BillingAddressForm = Record<BillingAddressField, string>;

/** The form values of a stored address (empty strings for unset fields). */
export function toBillingAddressForm(
  address: DriverBillingAddress | null | undefined,
): BillingAddressForm {
  const form = {} as BillingAddressForm;
  for (const { key } of BILLING_ADDRESS_FIELDS) form[key] = address?.[key] ?? '';
  return form;
}

/** The PATCH body of a form: trimmed values, a blank field sent as null (clears it). */
export function toBillingAddressBody(form: BillingAddressForm): DriverBillingAddress {
  const body = {} as DriverBillingAddress;
  for (const { key } of BILLING_ADDRESS_FIELDS) {
    const value = form[key].trim();
    body[key] = value === '' ? null : value;
  }
  return body;
}

/** True when no address line is set (the name alone is not an address). */
export function isBillingAddressEmpty(address: DriverBillingAddress | null | undefined): boolean {
  return BILLING_ADDRESS_FIELDS.every(
    ({ key }) => key === 'billingName' || (address?.[key] ?? '').trim() === '',
  );
}
