import { useTheme } from './ThemeContext';
import { lightColors, darkColors } from '@/constants/colors';

export function useColors() {
  const { theme } = useTheme();
  return theme === 'dark' ? darkColors : lightColors;
}
