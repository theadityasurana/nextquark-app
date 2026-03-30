import type { StyleProp, TextStyle, ViewStyle } from "react-native";

export interface AnimatedHeaderProps {
  readonly largeTitle: string;
  readonly subtitle?: string;
  readonly children: React.ReactNode;
  readonly rightComponent?: React.ReactNode;
  readonly showsVerticalScrollIndicator?: boolean;
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
  readonly backgroundColor?: string;
  readonly largeTitleColor?: string;
  readonly subtitleColor?: string;
  readonly largeHeaderTitleStyle?: StyleProp<TextStyle>;
  readonly largeHeaderSubtitleStyle?: StyleProp<TextStyle>;
  readonly smallHeaderTitleStyle?: StyleProp<TextStyle>;
  readonly smallHeaderSubtitleStyle?: StyleProp<TextStyle>;
}
