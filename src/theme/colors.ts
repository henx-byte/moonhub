// src/theme/colors.ts - iOS Dark Monochrome FINAL
export const colors = {
  // Backgrounds
  background: "#000000",
  card: "#1C1C1E",
  card2: "#2C2C2E",
  grouped: "#000000",
  groupedCard: "#1C1C1E",

  // Borders
  border: "#38383A",
  separator: "#38383A",
  borderLight: "#2C2C2E",

  // Texts
  text: "#FFFFFF",
  textSecondary: "#AEAEB2",
  textMuted: "#8E8E93",
  textTertiary: "#636366",
  textPlaceholder: "#636366",

  // Monochrome
  primary: "#FFFFFF",
  primaryMuted: "#2C2C2E",
  primaryText: "#000000",

  // System
  danger: "#FF453A",
  success: "#30D158",
  warning: "#FFD60A",
  info: "#0A84FF",

  // Overlay - fix transparan
  overlay: "rgba(0,0,0,0.85)",
  blur: "rgba(28,28,30,0.8)",
};

export const ios = {
  cornerRadius: {
    small: 10,
    medium: 16,
    large: 22,
    xl: 28,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 5,
    },
    floating: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.44,
      shadowRadius: 16,
      elevation: 12,
    },
    button: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    }
  }
};
