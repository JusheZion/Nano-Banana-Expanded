import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
}

export function Tooltip({
    content,
    children,
    side = 'bottom',
    align = 'center',
}: TooltipProps) {
    return (
        <TooltipPrimitive.Provider delayDuration={300}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        align={align}
                        sideOffset={8}
                        className="z-50 overflow-hidden rounded-md bg-neutral-900/95 backdrop-blur-md border border-white/20 px-3 py-2 text-xs text-white shadow-xl transition-all ease-in-out duration-200"
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-neutral-900/95 border-white/20" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
