"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search documents..." }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 rounded-xl border-border/70 bg-muted/30 pl-10 text-sm shadow-sm transition-shadow placeholder:text-muted-foreground/80 focus-visible:bg-background dark:bg-muted/20 dark:focus-visible:bg-input/30"
      />
    </div>
  );
}
