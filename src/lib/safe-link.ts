// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { Linking } from 'react-native';

// Contact details come from server data, so validate the shape before handing a
// mailto:/tel: URL to the OS. This blocks a hostile value from smuggling extra
// characters or a different scheme into the launched intent.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s().-]{4,}$/;

// Open the mail composer for a validated address. Returns false if the value is
// not a plausible email.
export function openEmail(email: string | null | undefined): boolean {
  const value = email?.trim() ?? '';
  if (!EMAIL_RE.test(value)) return false;
  void Linking.openURL(`mailto:${encodeURIComponent(value)}`);
  return true;
}

// Start a phone call for a validated number. Returns false if the value is not a
// plausible phone number.
export function openPhone(phone: string | null | undefined): boolean {
  const value = phone?.trim() ?? '';
  if (!PHONE_RE.test(value)) return false;
  void Linking.openURL(`tel:${encodeURIComponent(value)}`);
  return true;
}
