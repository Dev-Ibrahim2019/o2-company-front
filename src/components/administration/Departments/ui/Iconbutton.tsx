// ui/IconButton.tsx
import { ReactNode } from 'react';

interface IconButtonProps {
    onClick?: () => void;
    children: ReactNode;
    variant?: 'default' | 'danger';
    title?: string;
    className?: string;
}

const VARIANT_CLASSES = {
    default: 'hover:bg-white/5 text-slate-400 hover:text-white',
    danger: 'hover:bg-red-500/10 text-slate-400 hover:text-red-500',
};

const IconButton = ({ onClick, children, variant = 'default', title, className = '' }: IconButtonProps) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-2 rounded-lg transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
    >
        {children}
    </button>
);

export default IconButton;