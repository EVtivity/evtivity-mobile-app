// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';

const fallbackLogo = require('../../assets/logo.png') as number;

// Decode an operator logo data URI from the CSMS into something renderable.
// The seeded logo is an SVG data URI; SvgXml renders it crisply at any size.
function decodeSvg(uri: string | undefined): string | null {
  if (uri == null) return null;
  const b64 = /^data:image\/svg\+xml;base64,(.*)$/s.exec(uri);
  if (b64?.[1] != null) {
    try {
      return atob(b64[1]);
    } catch {
      return null;
    }
  }
  const raw = /^data:image\/svg\+xml,(.*)$/s.exec(uri);
  if (raw?.[1] != null) {
    try {
      return decodeURIComponent(raw[1]);
    } catch {
      return raw[1];
    }
  }
  return null;
}

// Operator-branded logo from the CSMS. Raster logos (uploaded PNG/JPEG or a
// hosted URL) render directly; simple SVG logos render via react-native-svg.
// The seeded EVtivity mark uses a <mask> and CSS @keyframes, neither of which
// react-native-svg supports, so those fall back to the bundled PNG mark.
export function BrandLogo({ uri, size = 34 }: { uri?: string; size?: number }): React.JSX.Element {
  if (uri != null && /^(https?:|data:image\/(png|jpe?g|webp|gif|avif|bmp))/i.test(uri)) {
    return <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  const svg = decodeSvg(uri);
  if (svg != null && !/<mask|<style|@keyframes/i.test(svg)) {
    return <SvgXml xml={svg} width={size} height={size} />;
  }
  return <Image source={fallbackLogo} style={{ width: size, height: size }} resizeMode="contain" />;
}
