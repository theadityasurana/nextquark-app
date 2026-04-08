import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type IconProps = { size?: number; color?: string; strokeWidth?: number; style?: any; fill?: string };

const ion = (name: string) => ({ size = 24, color = '#000', style }: IconProps) => (
  <Ionicons name={name as any} size={size} color={color} style={style} />
);

const mci = (name: string) => ({ size = 24, color = '#000', style }: IconProps) => (
  <MaterialCommunityIcons name={name as any} size={size} color={color} style={style} />
);

// Navigation
export const ChevronRight = ion('chevron-forward');
export const ChevronDown = ion('chevron-down');
export const ArrowLeft = ion('arrow-back');

// Actions
export const Plus = ion('add');
export const X = ion('close');
export const Check = ion('checkmark');
export const Pencil = ion('pencil');
export const Search = ion('search');
export const Settings = ion('settings-outline');
export const Share2 = ion('share-outline');
export const Upload = ion('cloud-upload-outline');
export const Copy = ion('copy-outline');
export const Trash2 = ion('trash-outline');
export const RefreshCw = ion('refresh');
export const Menu = ion('menu');
export const ExternalLink = ion('open-outline');

// Profile & People
export const Contact = ion('person-circle-outline');
export const Users = ion('people-outline');
export const Crown = ion('diamond-outline');

// Communication
export const Phone = ion('call-outline');
export const Mail = ion('mail-outline');
export const MailOpen = ion('mail-open-outline');
export const Send = ion('send');
export const Reply = ion('return-down-back-outline');
export const Forward = ion('return-down-forward-outline');
export const Inbox = ion('tray-outline');
export const Paperclip = ion('attach');
export const MessageSquareMore = ion('chatbubble-ellipses-outline');

// Content & Files
export const FileText = ion('document-text-outline');
export const FileCheck = ion('document-attach-outline');
export const FolderOpen = ion('folder-open-outline');
export const BookOpen = ion('book-outline');
export const ScrollText = ion('reader-outline');
export const Bookmark = ion('bookmark-outline');
export const Archive = ion('archive-outline');

// Work & Education
export const Briefcase = ion('briefcase-outline');
export const GraduationCap = ion('school-outline');
export const Building2 = ion('business-outline');
export const Laptop = ion('laptop-outline');

// Status & Info
export const Eye = ion('eye-outline');
export const Lock = ion('lock-closed-outline');
export const ShieldCheck = ion('shield-checkmark-outline');
export const AlertCircle = ion('alert-circle-outline');
export const HelpCircle = ion('help-circle-outline');
export const Info = ion('information-circle-outline');

// Symbols
export const Star = ion('star');
export const Heart = ion('heart-outline');
export const Trophy = ion('trophy-outline');
export const Award = ion('ribbon-outline');
export const BadgeCheck = ion('checkmark-circle-outline');
export const Gift = ion('gift-outline');
export const Zap = ion('flash');
export const Sparkles = ion('sparkles');
export const Rocket = ion('rocket-outline');
export const Target = ion('locate-outline');
export const Scale = ion('scale-outline');
export const Lightbulb = ion('bulb-outline');
export const TrendingUp = ion('trending-up');

// Media & Misc
export const Camera = ion('camera-outline');
export const MapPin = ion('location-outline');
export const Globe = ion('globe-outline');
export const Wifi = ion('wifi');
export const Clock = ion('time-outline');
export const Moon = ion('moon-outline');
export const Sun = ion('sunny-outline');
export const LogOut = ion('log-out-outline');
export const DollarSign = ion('cash-outline');
export const Link2 = ion('link-outline');

// Social — Ionicons doesn't have brand icons for all, use MCIs
export const Github = mci('github');
export const Linkedin = mci('linkedin');
export const Twitter = mci('twitter');
export const Instagram = ion('logo-instagram');
