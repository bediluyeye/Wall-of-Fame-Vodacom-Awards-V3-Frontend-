import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" | "soft" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
        variant === "default" && "bg-red-600 text-white",
        variant === "outline" && "border border-red-200 bg-white text-red-700",
        variant === "soft" && "bg-red-50 text-red-700",
        className
      )}
      {...props}
    />
  );
}
