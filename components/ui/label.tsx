import * as React from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "block text-[11px] font-medium tracking-brand text-ink-700 uppercase",
        className
      )}
      {...props}
    />
  );
}

export { Label };
