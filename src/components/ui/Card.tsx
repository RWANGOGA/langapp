"use client";

import { HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "popular";
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", hoverable = true, className = "", children, ...props }, ref) => {
    const variantClasses = variant === "popular" ? "card-popular" : "";
    const hoverClasses = hoverable ? "card-hoverable" : "";

    return (
      <div
        ref={ref}
        className={`card ${variantClasses} ${hoverClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";