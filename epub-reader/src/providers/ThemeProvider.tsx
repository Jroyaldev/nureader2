"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Load theme from user profile on mount
  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .single();

        if (profile?.preferences?.theme) {
          setThemeState(profile.preferences.theme);
        }
      } catch (error) {
        console.warn("Failed to load user theme preference:", error);
      }
      setMounted(true);
    };

    loadUserTheme();
  }, [supabase]);

  // Calculate resolved theme
  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme as ResolvedTheme;

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove("light", "dark");
    
    // Add new theme class
    root.classList.add(resolvedTheme);
    
    // Also set data attribute for CSS targeting
    root.setAttribute("data-theme", resolvedTheme);
    
    // Update theme-color meta tag
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", resolvedTheme === "dark" ? "#101215" : "#fcfcfd");
    }

    // Update body background immediately to prevent flashes
    document.body.style.backgroundColor = resolvedTheme === "dark" ? "#101215" : "#fcfcfd";

    // Store in localStorage for immediate access on page load
    localStorage.setItem("theme", theme);
    localStorage.setItem("resolvedTheme", resolvedTheme);
  }, [resolvedTheme, theme, mounted]);

  // Update theme
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Update user profile if logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            preferences: {
              theme: newTheme
            }
          })
          .eq("id", user.id);
      }
    } catch (error) {
      console.warn("Failed to update theme preference:", error);
    }
  }, [supabase]);

  // Prevent flash of wrong theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedResolvedTheme = localStorage.getItem("resolvedTheme") as ResolvedTheme | null;
    
    if (savedTheme) {
      setThemeState(savedTheme);
    }
    
    if (savedResolvedTheme) {
      document.documentElement.classList.add(savedResolvedTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, systemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}