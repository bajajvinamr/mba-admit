"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type BentoGridProps = {
  children: ReactNode;
  className?: string;
};

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

type BentoCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  /** Tailwind classes for the icon container bg */
  iconBg?: string;
  /** Make this card span 2 columns on lg */
  featured?: boolean;
  children?: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
};

export function BentoCard({
  title,
  description,
  icon,
  iconBg = "bg-primary/10",
  featured = false,
  children,
  className,
  href,
  onClick,
}: BentoCardProps) {
  const Wrapper = href ? "a" : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-card-hover",
        featured && "lg:col-span-2",
        href || onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
      <Wrapper {...wrapperProps} className="block">
        {icon && (
          <div
            className={cn(
              "mb-4 inline-flex size-10 items-center justify-center rounded-lg",
              iconBg
            )}
          >
            {icon}
          </div>
        )}
        <h3 className="heading-serif text-lg mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
      </Wrapper>
    </motion.div>
  );
}
