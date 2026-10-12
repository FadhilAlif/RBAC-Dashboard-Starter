"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/shared/lib/utils";

function hueFromString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h % 360;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

const AvatarRoot = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
AvatarRoot.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-semibold",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

interface ConvenientAvatarProps {
  name: string;
  size?: number;
  src?: string;
  className?: string;
}

type CombinedAvatarProps =
  | (ConvenientAvatarProps & { children?: never })
  | (React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { name?: never });

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  CombinedAvatarProps
>((props, ref) => {
  if ("name" in props && typeof props.name === "string") {
    const { name, size = 32, src, className, ...rest } = props as ConvenientAvatarProps;
    const hue = hueFromString(name);

    return (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full select-none shrink-0 font-semibold tracking-tight overflow-hidden",
          className
        )}
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.4),
          background: `oklch(0.78 0.10 ${hue})`,
          color: `oklch(0.28 0.10 ${hue})`,
          boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.04)",
        }}
        {...rest}
      >
        {src && <AvatarPrimitive.Image src={src} alt={name} className="aspect-square h-full w-full object-cover" />}
        <AvatarPrimitive.Fallback delayMs={src ? 600 : 0}>
          {getInitials(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
    );
  }

  return <AvatarRoot ref={ref} {...(props as React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>)} />;
});
Avatar.displayName = "Avatar";

export { Avatar, AvatarRoot, AvatarImage, AvatarFallback };
