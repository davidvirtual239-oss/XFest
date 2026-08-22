import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 ease-brand disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Unico elemento solido dorado de la pantalla: es LA accion principal.
        default:
          "bg-gradient-to-b from-gold-400 to-gold-600 text-ink-950 shadow-gold hover:from-gold-300 hover:to-gold-500 hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-gold-500/50 bg-transparent text-gold-400 hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-300",
        ghost: "text-cream-200 hover:bg-ink-800 hover:text-cream-50",
        link: "text-gold-400 underline-offset-4 hover:text-gold-300 hover:underline",
        // Secundario neutro: sobre fondo oscuro se define por el borde, no por el relleno.
        dark: "border border-white/12 bg-ink-800 text-cream-50 hover:border-white/20 hover:bg-ink-700",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-9 text-base tracking-wide",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
