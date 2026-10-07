import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import {
  lightColors,
  darkColors,
  fonts,
  space,
  radius,
  type,
  motion,
} from "./tokens";

const ThemeContext = createContext(null);

// Follows the OS appearance setting live. `scheme` forces "light" or "dark"
// (used for design previews and would back an in-app appearance setting).
export function ThemeProvider({ children, scheme }) {
  const systemScheme = useColorScheme();
  const resolved = scheme ?? systemScheme;

  const theme = useMemo(() => {
    const dark = resolved === "dark";
    return {
      dark,
      colors: dark ? darkColors : lightColors,
      fonts,
      space,
      radius,
      type,
      motion,
    };
  }, [resolved]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside <ThemeProvider>");
  return theme;
}
