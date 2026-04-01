"use client";

import { Textarea } from "@/components/ui/textarea";

interface RawEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function RawEditor({ value, onChange, readOnly }: RawEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className="min-h-[500px] font-mono text-sm resize-y bg-card"
      spellCheck={false}
    />
  );
}
