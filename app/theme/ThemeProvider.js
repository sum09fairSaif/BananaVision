import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, space, radius, type, motion } from "./tokens";

const ThemeContext = createContext(null);

// Follows the OS appearance setting live; no in-app toggle to keep settings empty.
export function ThemeProvider({ children }) {
  const scheme = useColorScheme();

  const theme = useMemo(() => {
    const dark = scheme === "dark";
    return {
      dark,
      colors: dark ? darkColors : lightColors,
      space,
      radius,
      type,
      motion,
    };
  }, [scheme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside <ThemeProvider>");
  return theme;
}
