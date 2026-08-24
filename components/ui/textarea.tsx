import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full resize-y rounded-2xl border border-ink-800 bg-ink-950 px-4 py-3 text-sm text-cream-50 outline-none transition-colors",
        "placeholder:text-ink-500/70 focus:border-gold-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
