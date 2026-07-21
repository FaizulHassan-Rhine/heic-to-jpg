import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "../lib/useTheme";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className, size = "icon" }) {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={cn(
        "rounded-full text-muted-foreground hover:text-foreground hover:bg-brand-sky/50 dark:hover:bg-accent",
        className
      )}
    >
      {!mounted ? (
        <Sun className="h-4 w-4 opacity-0" aria-hidden />
      ) : theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
