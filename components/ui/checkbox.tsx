import * as React from "react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded border-ink-800 accent-gold-500",
        "focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}

export { Checkbox };
