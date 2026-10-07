interface BadgeProps {
    variant: 'in-stock' | 'out-of-stock';
};

export default function Badge({variant}: BadgeProps) {
    const label = variant === 'in-stock';
    const classes = label ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    return (
        <span className={'text-xs px-2 py-1 rounded-full ' + classes}>
            {label ? 'In stock' : 'Out of stock'}
        </span>
    );
};