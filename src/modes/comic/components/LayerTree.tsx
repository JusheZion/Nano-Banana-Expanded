import React, { useMemo } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { Eye, EyeOff, Lock, Unlock, Square, MessageCircle, PenTool } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';

import type { DragEndEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LayerItemProps {
    id: string;
    name: string;
    type: 'panel' | 'balloon' | 'drawing';
    isLocked: boolean;
    isVisible: boolean;
    isSelected: boolean;
    onToggleVisibility: () => void;
    onToggleLock: () => void;
    onSelect: (e: React.MouseEvent) => void;
}

const SortableLayerItem: React.FC<LayerItemProps> = ({ id, name, type, isLocked, isVisible, isSelected, onToggleVisibility, onToggleLock, onSelect }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    const getIcon = () => {
        if (type === 'panel') return <Square className="w-4 h-4 text-blue-400" />;
        if (type === 'balloon') return <MessageCircle className="w-4 h-4 text-green-400" />;
        return <PenTool className="w-4 h-4 text-purple-400" />;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onSelect}
            className={`flex items-center justify-between p-2 mb-1 rounded-md cursor-pointer border select-none ${isSelected ? 'bg-white/10 border-gold-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <span className="text-sm font-medium truncate text-white/90">
                    {name}
                </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility();
                    }}
                    className={`p-1.5 rounded hover:bg-white/10 transition-colors ${!isVisible ? 'text-white/40' : 'text-white/80'}`}
                >
                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock();
                    }}
                    className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isLocked ? 'text-red-400' : 'text-white/40 hover:text-white/80'}`}
                >
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};

export const LayerTree: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const {
        pages,
        currentPageId,
        selectedElementIds,
        setSelectedElements,
        toggleSelection,
        reorderLayer,
        toggleLayerVisibility,
        toggleLayerLock
    } = useComicStore();

    const currentPage = pages.find(p => p.id === currentPageId);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Requires 5px movement to start drag, allowing clicks to pass through
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Build the items list. Top of list should be frontmost (end of array)
    // We must pass exactly the ids required to SortableContext
    const items = useMemo(() => {
        if (!currentPage) return [];

        // Reverse the array to show frontmost at top
        const reversedOrder = [...currentPage.layerOrder].reverse();

        return reversedOrder.map(id => {
            const panel = currentPage.panels.find(p => p.id === id);
            if (panel) return { id, name: `Panel ${panel.shapeType}`, type: 'panel' as const, isLocked: panel.isLocked ?? false, isVisible: panel.isVisible ?? true };

            const balloon = currentPage.balloons.find(b => b.id === id);
            if (balloon) return { id, name: balloon.text ? `"${balloon.text.substring(0, 10)}${balloon.text.length > 10 ? '...' : ''}"` : 'Balloon', type: 'balloon' as const, isLocked: balloon.isLocked ?? false, isVisible: balloon.isVisible ?? true };

            const drawing = currentPage.drawings?.find(d => d.id === id);
            if (drawing) return { id, name: 'Drawing Path', type: 'drawing' as const, isLocked: drawing.isLocked ?? false, isVisible: drawing.isVisible ?? true };

            return null;
        }).filter(item => item !== null) as { id: string, name: string, type: 'panel' | 'balloon' | 'drawing', isLocked: boolean, isVisible: boolean }[];
    }, [currentPage]);

    if (!isOpen || !currentPage) return null;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            reorderLayer(currentPage.id, active.id as string, over.id as string);
        }
    };

    return (
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-obsidian/95 border-l border-white/10 backdrop-blur-md shadow-2xl z-40 flex flex-col transform transition-transform duration-300">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gold-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                    Layers
                </h2>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors text-xl leading-none">
                    &times;
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        // We must pass exactly the ids mapped from the array
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {items.map(item => (
                            <SortableLayerItem
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                type={item.type}
                                isLocked={item.isLocked}
                                isVisible={item.isVisible}
                                isSelected={selectedElementIds.includes(item.id)}
                                onToggleVisibility={() => toggleLayerVisibility(currentPage.id, item.id)}
                                onToggleLock={() => toggleLayerLock(currentPage.id, item.id)}
                                onSelect={(e) => {
                                    if (e.shiftKey) {
                                        toggleSelection(item.id);
                                    } else {
                                        setSelectedElements([item.id]);
                                    }
                                }}
                            />
                        ))}
                        {items.length === 0 && (
                            <div className="text-center py-8 text-white/40 text-sm">
                                No layers yet.<br />Add a panel or balloon to start.
                            </div>
                        )}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};
