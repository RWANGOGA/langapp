import { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`container ${className}`}>
      {children}
    </div>
  );
}

export function ContentContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`content-container ${className}`}>
      {children}
    </div>
  );
}