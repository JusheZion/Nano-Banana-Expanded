import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CinematicGalleryProps {
    images?: string[];
}

export const CinematicGallery: React.FC<CinematicGalleryProps> = () => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    useTheme();

    // Mock Data simulating the Stitch MCP output or Local Assets
    // In a real scenario, this would come from the `images` prop
    const items = [
        { src: "/assets/images/Aries Palace.jpg", height: "h-[380px]" }, // Tall
        { src: "/assets/images/City of Aquarius.jpg", height: "h-[280px]" },
        { src: "/assets/images/Anunnaki Sphinx.png", height: "h-[280px]" },
        { src: "/assets/images/Aries Approaches the Observatory.png", height: "h-[280px]" },
        { src: "/assets/images/Flow's CEO Photo.png", height: "h-[380px]" }, // Tall
        { src: "/assets/images/Aries Palace.jpg", height: "h-[280px]" },
        { src: "/assets/images/Anunnaki Sphinx.png", height: "h-[280px]" },
        { src: "/assets/images/City of Aquarius.jpg", height: "h-[380px]" }, // Tall
    ];

    return (
        <div className="w-full px-8 py-8 animate-fade-in">
            {/* Header */}
            <div className="relative mb-10 mt-4">
                <h1 className="text-6xl font-extralight tracking-widest text-[#D4AF37] drop-shadow-lg leading-none">
                    REFERENCE
                    <br />
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FBF5D4] to-[#893741] tracking-[0.2em]">ALBUM</span>
                </h1>
                <p className="text-xl text-[#D4AF37]/60 mt-4 max-w-xl font-light tracking-wide flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-[#D4AF37]/40"></span>
                    High-fidelity visual library. <span className="text-white/90 font-medium">Constrained for clarity.</span>
                </p>
            </div>

            {/* Constrained Masonry Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 pb-20">
                {items.map((item, index) => {
                    // Logic for visual variety: Every 3rd item is "tall" (380px) or used from data
                    // We use the data-driven height here for precise control if available, or fallback

                    const heightClass = item.height;

                    return (
                        <div
                            key={index}
                            className={`
                                relative overflow-hidden rounded-[16px]
                                border border-[rgba(255,255,255,0.08)]
                                bg-white/[0.03] backdrop-blur-[16px]
                                ${heightClass}
                                transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
                                shadow-[0_4px_30px_rgba(0,0,0,0.1)]
                                group cursor-pointer
                                ${hoveredIndex === index ? 'translate-y-[-4px] border-[#5F368E]/50 shadow-[0_10px_40px_-10px_rgba(95,54,142,0.3)] ring-1 ring-[#5F368E]/20' : ''}
                            `}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Image Layer - Constrained Object Fit */}
                            <img
                                src={item.src}
                                alt={`Reference ${index}`}
                                className={`
                                    w-full h-full object-cover
                                    transition-transform duration-700 ease-out
                                    opacity-90 group-hover:opacity-100
                                    ${hoveredIndex === index ? 'scale-110' : 'scale-100'}
                                `}
                            />

                            {/* Hover Overlay */}
                            <div className={`
                                absolute inset-0 bg-gradient-to-t from-[#5F368E]/80 via-transparent to-transparent
                                transition-opacity duration-300
                                ${hoveredIndex === index ? 'opacity-100' : 'opacity-0'}
                            `} />

                            {/* Label */}
                            <div className={`
                                absolute bottom-0 left-0 p-6 w-full transform transition-all duration-300
                                ${hoveredIndex === index ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                            `}>
                                <div className="text-xs font-bold text-[#BF5AF2] tracking-widest mb-1">ASSET {index + 1}</div>
                                <div className="text-white font-bold text-lg leading-none">Visual Reference</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
