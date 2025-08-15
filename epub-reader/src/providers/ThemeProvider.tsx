"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

type Theme = "light" | "dark";
type ResolvedTheme = "light" | "dark";
type ReadingTheme = "default" | "sepia" | "high-contrast";

interface ThemePreferences {
  theme: Theme;
  readingTheme: ReadingTheme;
  reducedMotion: boolean;
  highContrast: boolean;
}

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  readingTheme: ReadingTheme;
  preferences: ThemePreferences;
  setTheme: (theme: Theme) => void;
  setReadingTheme: (readingTheme: ReadingTheme) => void;
  updatePreferences: (preferences: Partial<ThemePreferences>) => void;
  systemTheme: ResolvedTheme;
  isTransitioning: boolean;
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
  const [theme, setThemeState] = useState<Theme>("light");
  const [readingTheme, setReadingThemeState] = useState<ReadingTheme>("default");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preferences, setPreferences] = useState<ThemePreferences>({
    theme: "light",
    readingTheme: "default",
    reducedMotion: false,
    highContrast: false,
  });
  const supabase = createClient();

  // Detect system preferences
  useEffect(() => {
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const highContrastQuery = window.matchMedia("(prefers-contrast: high)");

    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
      document.documentElement.classList.toggle("reduce-motion", e.matches);
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }));
      document.documentElement.classList.toggle("high-contrast", e.matches);
    };

    // Set initial values
    setSystemTheme(darkModeQuery.matches ? "dark" : "light");
    setPreferences(prev => ({
      ...prev,
      reducedMotion: reducedMotionQuery.matches,
      highContrast: highContrastQuery.matches,
    }));

    // Apply initial classes
    document.documentElement.classList.toggle("reduce-motion", reducedMotionQuery.matches);
    document.documentElement.classList.toggle("high-contrast", highContrastQuery.matches);

    // Add listeners
    darkModeQuery.addEventListener("change", handleDarkModeChange);
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    highContrastQuery.addEventListener("change", handleHighContrastChange);

    return () => {
      darkModeQuery.removeEventListener("change", handleDarkModeChange);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      highContrastQuery.removeEventListener("change", handleHighContrastChange);
    };
  }, []);

  // Load preferences from user profile on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .single();

        if (profile?.preferences) {
          const userPrefs = profile.preferences;
          if (userPrefs.theme) {
            setThemeState(userPrefs.theme);
          }
          if (userPrefs.readingTheme) {
            setReadingThemeState(userPrefs.readingTheme);
          }
          setPreferences(prev => ({
            ...prev,
            theme: userPrefs.theme || prev.theme,
            readingTheme: userPrefs.readingTheme || prev.readingTheme,
            reducedMotion: userPrefs.reducedMotion ?? prev.reducedMotion,
            highContrast: userPrefs.highContrast ?? prev.highContrast,
          }));
        }
      } catch (error) {
        console.warn("Failed to load user preferences:", error);
      }
      setMounted(true);
    };

    loadUserPreferences();
  }, [supabase]);

  // Resolved theme is just the theme itself now (no system option)
  const resolvedTheme: ResolvedTheme = theme;

  // Apply theme and preferences to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Start transition
    setIsTransitioning(true);
    root.classList.add("theme-transitioning");
    
    // Remove existing theme classes
    root.classList.remove("light", "dark", "theme-sepia", "theme-high-contrast");
    
    // Add new theme class
    root.classList.add(resolvedTheme);
    
    // Add reading theme class
    if (readingTheme !== "default") {
      root.classList.add(`theme-${readingTheme}`);
    }
    
    // Add preference classes
    root.classList.toggle("reduce-motion", preferences.reducedMotion);
    root.classList.toggle("high-contrast", preferences.highContrast);
    
    // Set data attributes for CSS targeting
    root.setAttribute("data-theme", resolvedTheme);
    root.setAttribute("data-reading-theme", readingTheme);
    
    // Update theme-color meta tag
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      const themeColors: Record<ResolvedTheme, string> = {
        light: "#ffffff",
        dark: "#101215"
      };
      metaThemeColor.setAttribute("content", themeColors[resolvedTheme] || "#ffffff");
    }

    // Update body background immediately to prevent flashes
    const backgroundColors: Record<ResolvedTheme, string> = {
      light: "#ffffff",
      dark: "#101215"
    };
    document.body.style.backgroundColor = backgroundColors[resolvedTheme] || "#ffffff";

    // Store in localStorage for immediate access on page load
    localStorage.setItem("theme", theme);
    localStorage.setItem("readingTheme", readingTheme);
    localStorage.setItem("resolvedTheme", resolvedTheme);
    localStorage.setItem("themePreferences", JSON.stringify(preferences));

    // End transition after a short delay
    const transitionTimeout = setTimeout(() => {
      setIsTransitioning(false);
      root.classList.remove("theme-transitioning");
    }, 150);

    return () => clearTimeout(transitionTimeout);
  }, [resolvedTheme, theme, readingTheme, preferences, mounted]);

  // Update theme
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    const updatedPreferences = { ...preferences, theme: newTheme };
    setPreferences(updatedPreferences);
    
    // Update user profile if logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            preferences: updatedPreferences
          })
          .eq("id", user.id);
      }
    } catch (error) {
      console.warn("Failed to update theme preference:", error);
    }
  }, [supabase, preferences]);

  // Update reading theme
  const setReadingTheme = useCallback(async (newReadingTheme: ReadingTheme) => {
    setReadingThemeState(newReadingTheme);
    const updatedPreferences = { ...preferences, readingTheme: newReadingTheme };
    setPreferences(updatedPreferences);
    
    // Update user profile if logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            preferences: updatedPreferences
          })
          .eq("id", user.id);
      }
    } catch (error) {
      console.warn("Failed to update reading theme preference:", error);
    }
  }, [supabase, preferences]);

  // Update multiple preferences at once
  const updatePreferences = useCallback(async (newPreferences: Partial<ThemePreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);
    
    if (newPreferences.theme) {
      setThemeState(newPreferences.theme);
    }
    if (newPreferences.readingTheme) {
      setReadingThemeState(newPreferences.readingTheme);
    }
    
    // Update user profile if logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            preferences: updatedPreferences
          })
          .eq("id", user.id);
      }
    } catch (error) {
      console.warn("Failed to update preferences:", error);
    }
  }, [supabase, preferences]);

  // Prevent flash of wrong theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedReadingTheme = localStorage.getItem("readingTheme") as ReadingTheme | null;
    const savedResolvedTheme = localStorage.getItem("resolvedTheme") as ResolvedTheme | null;
    const savedPreferences = localStorage.getItem("themePreferences");
    
    if (savedTheme) {
      setThemeState(savedTheme);
    }
    
    if (savedReadingTheme) {
      setReadingThemeState(savedReadingTheme);
    }
    
    if (savedPreferences) {
      try {
        const parsedPreferences = JSON.parse(savedPreferences);
        setPreferences(parsedPreferences);
      } catch (error) {
        console.warn("Failed to parse saved preferences:", error);
      }
    }
    
    if (savedResolvedTheme) {
      document.documentElement.classList.add(savedResolvedTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        resolvedTheme, 
        readingTheme,
        preferences,
        setTheme, 
        setReadingTheme,
        updatePreferences,
        systemTheme,
        isTransitioning
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
