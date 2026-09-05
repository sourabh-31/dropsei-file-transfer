import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant =
  | "primary"
  | "coral"
  | "secondary"
  | "ghost"
  | "ghost-lime"
  | "ghost-danger";

type ButtonSize = "sm" | "md" | "lg" | "none";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-lime text-background font-bold hover:bg-accent-lime-hover",
  coral:
    "bg-accent-coral text-background font-bold hover:bg-accent-coral-hover",
  secondary: "bg-surface-strong text-foreground hover:bg-surface-strong-hover",
  ghost: "bg-transparent text-muted hover:text-foreground",
  "ghost-lime": "bg-transparent text-accent-lime hover:text-foreground",
  "ghost-danger":
    "bg-transparent text-accent-coral hover:text-accent-coral-hover",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4.5 py-2.5 text-sm rounded-md",
  md: "px-5 py-3 text-sm rounded-md",
  lg: "px-7 py-4 text-base rounded-md",
  none: "",
};

export default function Button({
  variant = "primary",
  size,
  className,
  ...props
}: ButtonProps) {
  const resolvedSize = size ?? (variant.startsWith("ghost") ? "none" : "md");
  return (
    <button
      className={cn(
        "cursor-pointer font-sans transition-colors",
        variantClasses[variant],
        sizeClasses[resolvedSize],
        className,
      )}
      {...props}
    />
  );
}
