"use client";

import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "coral" | "teal" | "success" | "navy";
  size?: "sm" | "md";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "coral", size = "md", className = "", children, ...props }, ref) => {
    const variantClasses = `badge-${variant}`;
    const sizeClasses = size === "sm" ? "badge-sm" : "";

    return (
      <span
        ref={ref}
        className={`badge ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";