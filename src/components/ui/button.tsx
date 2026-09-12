import { forwardRef, type ButtonHTMLAttributes } from 'react';

// ---------------------------------------------------------------------------
// Button variants
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-ember text-void hover:bg-ember/90 active:bg-ember/80',
  secondary:
    'bg-stone text-parchment border border-ash/20 hover:border-ash/40 active:bg-stone/80',
  ghost:
    'bg-transparent text-ash hover:text-parchment active:text-parchment/80',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={[
          'inline-flex items-center justify-center',
          'px-6 py-2.5',
          'font-display text-sm tracking-widest uppercase',
          'transition-colors duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
          'disabled:opacity-40 disabled:pointer-events-none',
          variantStyles[variant],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { Button };
export type { ButtonProps };
