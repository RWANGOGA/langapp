"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "coral" | "teal" | "navy" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "coral", size = "md", fullWidth = false, className = "", children, ...props }, ref) => {
    const baseClasses = "btn";
    const variantClasses = `btn-${variant}`;
    const sizeClasses = size !== "md" ? `btn-${size}` : "";
    const widthClasses = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";