import  {ReactNode}  from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
}

export default function Card ({children, className}: CardProps) {
    return (
        <div className={'p-6 bg-white shadow rounded ${className}'}>
            {children}
        </div>
    )
}