import React from "react"

interface CardProps {
    children: React.ReactNode
};

export default function Card({children}: CardProps) {
    return (
        <div className="border border-gray-700 rounded-lg p-4 w-56">
            {children}
        </div>
    );
};