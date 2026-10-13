// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FileText } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  ListRow,
  Spinner,
  EmptyState,
  BackButton,
  useToast,
} from '@/components/ui';
import { DetailRow as Row } from '@/components/SessionCostRows';
import { hsl } from '@/lib/theme';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate, formatDay, formatEnergyWh } from '@/lib/format';
import { formatTaxRatePercent } from '@/lib/price-display';
import { billToLines, invoiceStatusVariant, type PortalInvoiceLine } from '@/lib/invoices';
import { shareInvoicePdf } from '@/lib/invoice-pdf';
import { useInvoice } from '@/features/account';

function lineDetail(line: PortalInvoiceLine): string {
  const parts: string[] = [];
  if (line.sessionDate != null) parts.push(formatDay(line.sessionDate));
  if (line.stationName != null) parts.push(line.stationName);
  if (line.energyWh != null) parts.push(formatEnergyWh(line.energyWh));
  return parts.join(' · ');
}

// One invoice or credit note of the driver, as printed: status, dates, the
// bill-to block of a member invoice, the lines, tax per rate and the total.
// The PDF opens in the share sheet.
export default function InvoiceDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoice = useInvoice(id);
  const [sharing, setSharing] = React.useState(false);

  const data = invoice.data;

  const onShare = async (): Promise<void> => {
    if (data == null) return;
    setSharing(true);
    try {
      await shareInvoicePdf(data);
    } catch {
      toast.show(t('invoices.downloadFailed'), 'error');
    } finally {
      setSharing(false);
    }
  };

  const openInvoice = (target: string): void => {
    router.push({ pathname: '/account/invoices/[id]', params: { id: target } });
  };

  if (invoice.isLoading) {
    return (
      <Screen>
        <BackButton />
        <Spinner />
      </Screen>
    );
  }

  if (data == null) {
    const notFound = invoice.error instanceof ApiError && invoice.error.status === 404;
    return (
      <Screen>
        <BackButton />
        <EmptyState
          icon={<FileText size={40} color={hsl('mutedForeground')} />}
          title={notFound ? t('invoices.notFound') : t('invoices.loadFailed')}
        />
      </Screen>
    );
  }

  const billTo = billToLines(data.billTo);

  return (
    <Screen scroll>
      <BackButton />
      <View className="mb-4 gap-2">
        <Text className="text-sm text-muted-foreground">
          {data.kind === 'credit_note' ? t('invoices.creditNote') : t('invoices.invoice')}
        </Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="h1" className="flex-1" numberOfLines={1}>
            {data.invoiceNumber}
          </Text>
          <Badge
            testID="invoice-status"
            label={t(`invoices.status.${data.status}`, { defaultValue: data.status })}
            variant={invoiceStatusVariant(data.status)}
          />
        </View>
        {data.viaFleetName != null ? (
          <Text className="text-sm text-muted-foreground">
            {t('invoices.viaFleet', { fleet: data.viaFleetName })}
          </Text>
        ) : null}
      </View>

      <Card className="gap-3">
        <Row
          testID="invoice-total"
          label={t('invoices.total')}
          value={formatCurrency(data.totalCents, data.currency)}
        />
        {data.periodStart != null && data.periodEnd != null ? (
          <Row
            label={t('invoices.period')}
            value={`${formatDay(data.periodStart)} - ${formatDay(data.periodEnd)}`}
          />
        ) : null}
        {data.issuedAt != null ? (
          <Row label={t('invoices.issued')} value={formatDate(data.issuedAt)} />
        ) : null}
        {data.status === 'issued' && data.dueAt != null ? (
          <Row label={t('invoices.due')} value={formatDate(data.dueAt)} />
        ) : null}
        {data.paidAt != null ? (
          <Row label={t('invoices.paidOn')} value={formatDate(data.paidAt)} />
        ) : null}
        {data.creditReason != null && data.creditReason !== '' ? (
          <Row label={t('invoices.reason')} value={data.creditReason} />
        ) : null}
      </Card>

      {data.creditedInvoice != null || data.creditNote != null ? (
        <Card className="py-0">
          {data.creditedInvoice != null ? (
            <ListRow
              testID="invoice-credited-link"
              title={t('invoices.credits', { number: data.creditedInvoice.invoiceNumber })}
              onPress={() => openInvoice(data.creditedInvoice?.id ?? '')}
            />
          ) : null}
          {data.creditNote != null ? (
            <ListRow
              testID="invoice-credit-note-link"
              title={t('invoices.creditedBy', { number: data.creditNote.invoiceNumber })}
              onPress={() => openInvoice(data.creditNote?.id ?? '')}
            />
          ) : null}
        </Card>
      ) : null}

      {billTo.length > 0 ? (
        <Card className="gap-1" testID="invoice-bill-to">
          <Text weight="semibold" className="mb-1 text-sm text-muted-foreground">
            {t('invoices.billTo')}
          </Text>
          {billTo.map((line, i) => (
            <Text key={i} className="text-sm text-foreground">
              {line}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card className="gap-3">
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {t('invoices.items')}
        </Text>
        {data.lineItems.map((line) => {
          const detail = lineDetail(line);
          return (
            <View key={line.id} testID={`invoice-line-${String(line.id)}`} className="gap-0.5">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-sm text-foreground">{line.description}</Text>
                <Text variant="label" tabular>
                  {formatCurrency(line.totalCents, data.currency)}
                </Text>
              </View>
              {detail !== '' ? (
                <Text className="text-xs text-muted-foreground">{detail}</Text>
              ) : null}
            </View>
          );
        })}
        <View className="gap-3 border-t border-muted-foreground/30 pt-3">
          <Row
            label={t('invoices.net')}
            value={formatCurrency(data.subtotalCents, data.currency)}
          />
          {data.taxBreakdown.map((tax) => (
            <Row
              key={tax.taxRate}
              label={t('charge.detail.taxAdded', { rate: formatTaxRatePercent(tax.taxRate) })}
              value={formatCurrency(tax.taxCents, data.currency)}
            />
          ))}
          <Row label={t('invoices.total')} value={formatCurrency(data.totalCents, data.currency)} />
        </View>
      </Card>

      <Button
        testID="invoice-share-pdf"
        title={t('invoices.downloadPdf')}
        loading={sharing}
        onPress={() => void onShare()}
      />
    </Screen>
  );
}
