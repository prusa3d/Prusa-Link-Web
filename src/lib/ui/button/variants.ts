// Class strings from @prusa/connect-ui's Button (primitives/button/variants.ts),
// so PrusaLink looks like Prusa Connect without shipping bits-ui.
export type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer rounded-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-default [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

export const variants: Record<ButtonVariant, string> = {
  default:
    'border border-primary bg-primary text-primary-foreground hover:border-primary-hovered hover:bg-primary-hovered active:border-transparent active:bg-primary-pressed disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground',
  secondary:
    'border border-secondary bg-secondary text-secondary-foreground hover:border-primary hover:bg-secondary-hovered active:border-primary active:bg-primary active:text-primary-foreground disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground',
  ghost:
    'border border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground active:bg-secondary active:text-secondary-foreground disabled:text-disabled-foreground',
  destructive:
    'border border-destructive bg-transparent text-destructive-text hover:bg-destructive hover:text-destructive-foreground active:bg-destructive-hovered active:text-destructive-foreground disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground',
};

export const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
};
