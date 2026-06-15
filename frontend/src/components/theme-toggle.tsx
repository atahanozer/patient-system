"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoid hydration mismatch: the resolved theme is only known on the client.
  // useSyncExternalStore returns false on the server / first paint, true after.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? (
        <MoonIcon className="size-4" />
      ) : (
        <SunIcon className="size-4" />
      )}
    </Button>
  );
}
