import { cn } from 'tailwind-variants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline';
}

export default function Button({ variant = 'default', className, ...props }: ButtonProps) {
    const baseStyles = 'px-4 py-2 rounded font-medium transition';
    const variants = {
        default: 'bg-blue-500 text-white hover:bg-blue-600',
        outline: 'border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white',
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], className) as unknown as string}
            {...props}
        />
    );
}
