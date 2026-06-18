// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import type { Icon as PhosphorComponent, IconProps as PhosphorIconProps } from 'phosphor-react-native';
import {
  House as PHouse,
  Lightning as PLightning,
  BatteryCharging as PBatteryCharging,
  Gauge as PGauge,
  CurrencyDollar as PCurrencyDollar,
  Clock as PClock,
  CaretLeft as PCaretLeft,
  CaretRight as PCaretRight,
  CaretDown as PCaretDown,
  Bell as PBell,
  BellRinging as PBellRinging,
  Star as PStar,
  User as PUser,
  Car as PCar,
  CreditCard as PCreditCard,
  Cardholder as PCardholder,
  QrCode as PQrCode,
  MapPin as PMapPin,
  Lifebuoy as PLifebuoy,
  ShieldCheck as PShieldCheck,
  FileText as PFileText,
  ArrowSquareOut as PArrowSquareOut,
  Info as PInfo,
  Warning as PWarning,
  Check as PCheck,
  Plus as PPlus,
  Trash as PTrash,
  X as PX,
  PaperPlaneRight as PPaperPlaneRight,
  CalendarDots as PCalendarDots,
  Pulse as PPulse,
  Plug as PPlug,
  PlugCharging as PPlugCharging,
  Lock as PLock,
  Leaf as PLeaf,
  Globe as PGlobe,
  NavigationArrow as PNavigationArrow,
  Envelope as PEnvelope,
  Phone as PPhone,
  ChatCircleText as PChatCircleText,
  Key as PKey,
  Pause as PPause,
  Image as PImage,
  Receipt as PReceipt,
  Eye as PEye,
  EyeSlash as PEyeSlash,
} from 'phosphor-react-native';

// App icon set, backed by Phosphor (SVG via react-native-svg). Components keep
// the previous names so call sites are unchanged; only the import source is
// '@/components/icons'. strokeWidth is accepted and ignored; pass `weight`
// ('regular' | 'bold' | 'fill' | 'duotone') for the fuller Phosphor styles.
export type IconWeight = PhosphorIconProps['weight'];

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  weight?: IconWeight;
}

export type LucideIcon = React.FC<IconProps>;

function make(PIcon: PhosphorComponent): React.FC<IconProps> {
  function Icon({ size = 24, color = '#000', weight = 'regular' }: IconProps): React.JSX.Element {
    return <PIcon size={size} color={color} weight={weight} />;
  }
  return Icon;
}

export const Activity = make(PPulse);
export const AlertTriangle = make(PWarning);
export const BatteryCharging = make(PBatteryCharging);
export const Bell = make(PBell);
export const BellRing = make(PBellRinging);
export const CalendarClock = make(PCalendarDots);
export const Car = make(PCar);
export const Check = make(PCheck);
export const ChevronDown = make(PCaretDown);
export const ChevronLeft = make(PCaretLeft);
export const ChevronRight = make(PCaretRight);
export const Clock = make(PClock);
export const CreditCard = make(PCreditCard);
export const DollarSign = make(PCurrencyDollar);
export const ExternalLink = make(PArrowSquareOut);
export const FileText = make(PFileText);
export const Gauge = make(PGauge);
export const Home = make(PHouse);
export const Info = make(PInfo);
export const LifeBuoy = make(PLifebuoy);
export const Lock = make(PLock);
export const MapPin = make(PMapPin);
export const Nfc = make(PCardholder);
export const Plug = make(PPlug);
export const PlugZap = make(PPlugCharging);
export const Plus = make(PPlus);
export const QrCode = make(PQrCode);
export const Send = make(PPaperPlaneRight);
export const ShieldCheck = make(PShieldCheck);
export const Star = make(PStar);
export const Trash2 = make(PTrash);
export const User = make(PUser);
export const X = make(PX);
export const Zap = make(PLightning);
export const Leaf = make(PLeaf);
export const Globe = make(PGlobe);
export const Navigation = make(PNavigationArrow);
export const Mail = make(PEnvelope);
export const Phone = make(PPhone);
export const MessageSquare = make(PChatCircleText);
export const KeyRound = make(PKey);
export const Pause = make(PPause);
export const ImageIcon = make(PImage);
export const Receipt = make(PReceipt);
export const Eye = make(PEye);
export const EyeSlash = make(PEyeSlash);
