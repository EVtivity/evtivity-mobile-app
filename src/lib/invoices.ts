// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The driver's invoices (GET /v1/portal/invoices): ordinary driver invoices,
// the member invoices a fleet addresses to the driver, and their credit notes.
// A fleet's own invoice never reaches the driver.

import type { BadgeVariant } from '@/lib/status-variants';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'credited';

/** A row of GET /v1/portal/invoices. */
export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  kind: 'invoice' | 'credit_note';
  status: InvoiceStatus;
  /** Member invoices and their credit notes: the fleet whose account the sessions were charged on. */
  viaFleetName: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  creditedInvoiceId: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: string;
}

export interface PortalInvoiceLine {
  id: number;
  sessionId: string | null;
  description: string;
  quantity: string;
  unitPriceCents: number;
  totalCents: number;
  taxCents: number;
  taxRate: string;
  kind: string | null;
  sessionDate: string | null;
  energyWh: number | null;
  stationName: string | null;
}

export interface PortalInvoiceTaxLine {
  taxRate: number;
  netCents: number;
  taxCents: number;
  grossCents: number;
}

export interface PortalInvoiceReference {
  id: string;
  invoiceNumber: string;
}

/** GET /v1/portal/invoices/:id. */
export interface PortalInvoiceDetail extends PortalInvoice {
  billTo: Record<string, unknown> | null;
  creditReason: string | null;
  lineItems: PortalInvoiceLine[];
  taxBreakdown: PortalInvoiceTaxLine[];
  creditedInvoice: PortalInvoiceReference | null;
  creditNote: PortalInvoiceReference | null;
}

/** Badge variant of an invoice status. Unknown values (a newer API) fall back to secondary. */
export function invoiceStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'paid':
      return 'success';
    case 'issued':
      return 'info';
    default:
      return 'secondary';
  }
}

/** The printable lines of a bill-to snapshot (name, street, city line, country, email). */
export function billToLines(billTo: Record<string, unknown> | null | undefined): string[] {
  if (billTo == null) return [];
  const text = (key: string): string => {
    const v = billTo[key];
    return typeof v === 'string' ? v.trim() : '';
  };
  const cityLine = [text('zip'), text('city'), text('state')].filter((s) => s !== '').join(' ');
  return [text('name'), text('street'), cityLine, text('country'), text('email')].filter(
    (s) => s !== '',
  );
}

/**
 * A safe local file name for an invoice PDF. The number comes from the server,
 * so anything but letters, digits, dot, dash and underscore is replaced.
 */
export function invoicePdfFileName(invoiceNumber: string): string {
  const base = invoiceNumber.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '');
  return `${base === '' ? 'invoice' : base}.pdf`;
}
