import { cn } from 'tailwind-variants';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Input({className, ...props }: InputProps) {
    return (
        <input
            className={cn(
                'px-4 py-2 border rounded focus:outine-none focus:ring focus:ring-blue-300',
                className
            ) as unknown as string}
            {...props}
        />
    );
}
