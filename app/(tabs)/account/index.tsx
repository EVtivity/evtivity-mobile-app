// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  User,
  ShieldCheck,
  BellRing,
  LayoutGrid,
  CreditCard,
  Nfc,
  Car,
  Star,
  LifeBuoy,
  Info,
} from '@/components/icons';
import { Screen, Text, Card, ListRow, Button } from '@/components/ui';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/lib/auth';
import { hsl } from '@/lib/theme';
import { formatDate } from '@/lib/format';

export default function AccountScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const driver = useAuth((s) => s.driver);
  const logout = useAuth((s) => s.logout);

  const fullName = driver != null ? `${driver.firstName} ${driver.lastName}`.trim() : '';

  return (
    <Screen scroll>
      <AppHeader />
      <View>
        <Text variant="h1">{fullName.length > 0 ? fullName : t('account.title')}</Text>
        {driver?.email != null ? (
          <Text className="text-sm text-muted-foreground">{driver.email}</Text>
        ) : null}
        {driver?.createdAt != null ? (
          <Text className="text-sm text-muted-foreground">
            {t('account.memberSince', { date: formatDate(driver.createdAt) })}
          </Text>
        ) : null}
      </View>

      <Card className="p-0 px-5">
        <ListRow
          testID="account-row-personal"
          title={t('account.personalInfo')}
          left={<User size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/personal')}
        />
        <ListRow
          testID="account-row-security"
          className="border-t border-muted-foreground/30"
          title={t('account.security')}
          left={<ShieldCheck size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/security')}
        />
        <ListRow
          testID="account-row-notifications"
          className="border-t border-muted-foreground/30"
          title={t('account.notifications')}
          left={<BellRing size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/notifications')}
        />
        <ListRow
          testID="account-row-home-cards"
          className="border-t border-muted-foreground/30"
          title={t('account.homeScreen')}
          left={<LayoutGrid size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/home-cards')}
        />
      </Card>

      <Card className="p-0 px-5">
        <ListRow
          testID="account-row-payment"
          title={t('account.paymentMethods')}
          left={<CreditCard size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/payment-methods')}
        />
        <ListRow
          testID="account-row-rfid"
          className="border-t border-muted-foreground/30"
          title={t('account.rfid')}
          left={<Nfc size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/rfid')}
        />
        <ListRow
          testID="account-row-vehicles"
          className="border-t border-muted-foreground/30"
          title={t('account.vehicles')}
          left={<Car size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/vehicles')}
        />
      </Card>

      <Card className="p-0 px-5">
        <ListRow
          testID="account-row-favorites"
          title={t('favorites.title')}
          left={<Star size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/favorites')}
        />
        <ListRow
          testID="account-row-support"
          className="border-t border-muted-foreground/30"
          title={t('account.support')}
          left={<LifeBuoy size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/support')}
        />
        <ListRow
          testID="account-row-about"
          className="border-t border-muted-foreground/30"
          title={t('account.about')}
          left={<Info size={20} color={hsl('mutedForeground')} />}
          onPress={() => router.push('/account/about')}
        />
      </Card>

      <Button
        testID="account-signout"
        title={t('auth.signOut')}
        variant="outline"
        onPress={() => void logout()}
      />
    </Screen>
  );
}
