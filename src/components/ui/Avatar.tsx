"use client";

import { HTMLAttributes, forwardRef } from "react";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  src?: string;
  alt?: string;
  fallback?: string;
  gradient?: "default" | "blue" | "amber" | "teal" | "pink";
}

const gradients = {
  default: "linear-gradient(135deg, #e9a98f, #b56a52)",
  blue: "linear-gradient(135deg, #8fb7e9, #4a6fa5)",
  amber: "linear-gradient(135deg, #f0c36b, #c98a1b)",
  teal: "linear-gradient(135deg, #7fd1c4, #2a8c82)",
  pink: "linear-gradient(135deg, #d99ab8, #9c4d78)",
};

const sizes = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-2xl",
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ size = "md", src, alt, fallback = "?", gradient = "default", className = "", children, ...props }, ref) => {
    const sizeClasses = sizes[size];
    const style = src ? undefined : { background: gradients[gradient] };

    if (src) {
      return (
        <div
          ref={ref}
          role="img"
          aria-label={alt}
          className={`avatar ${sizeClasses} ${className}`}
          style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref}
        role={alt ? "img" : undefined}
        aria-label={alt}
        className={`avatar ${sizeClasses} ${className}`}
        style={style}
        {...props}
      >
        {children || fallback}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";