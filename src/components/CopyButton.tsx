import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface CopyButtonProps {
    text: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const { activeTheme } = useTheme();

    const handleCopy = async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    // Determine flash color based on theme
    const flashColor = activeTheme === 'crimson' ? '#893741' : activeTheme === 'teal' ? '#37615D' : '#5F368E';

    return (
        <button
            onClick={handleCopy}
            className={`
                group relative px-6 py-2 rounded-full font-bold transition-all duration-300
                ${copied ? 'text-white' : 'glass-card hover:bg-white/10 text-white'}
                ${copied ? 'scale-105' : 'scale-100'}
            `}
            style={{
                backgroundColor: copied ? flashColor : undefined,
                boxShadow: copied ? `0 0 20px ${flashColor}` : undefined,
                borderColor: copied ? flashColor : undefined
            }}
        >
            <span className="flex items-center gap-2">
                {copied ? (
                    <>
                        <CheckIcon />
                        <span>Copied!</span>
                    </>
                ) : (
                    <>
                        <CopyIcon />
                        <span>Copy Prompt</span>
                    </>
                )}
            </span>
        </button>
    );
};

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);
