import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { Eye, EyeOff, Lock, Unlock, Square, MessageCircle, PenTool, GripVertical, BoxSelect, ChevronDown, ChevronRight } from 'lucide-react';
import { elementsOverlapOrNear } from '../utils/snapping';
import { ACCENT_GOLD_GRADIENT } from '../theme/Phase12DesignTokens';
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
import { PRIMARY_BG_FLAT } from '../theme/Phase12DesignTokens';

interface LayerItemProps {
    id: string;
    name: string;
    type: 'panel' | 'balloon' | 'drawing' | 'group';
    isLocked: boolean;
    isVisible: boolean;
    isSelected: boolean;
    onToggleVisibility: () => void;
    onToggleLock: () => void;
    onSelect: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    /** When true, use royal blue for text/icons (right sidebar theme). */
    royalBlue?: boolean;
    /** For type 'group': expand/collapse */
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const SortableLayerItem: React.FC<LayerItemProps> = ({ id, name, type, isLocked, isVisible, isSelected, onToggleVisibility, onToggleLock, onSelect, onContextMenu, royalBlue, isExpanded, onToggleExpand }) => {
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
        const c = royalBlue ? '' : type === 'panel' ? ' text-blue-400' : type === 'balloon' ? ' text-green-400' : type === 'group' ? ' text-amber-400' : ' text-purple-400';
        if (type === 'panel') return <Square className={`w-4 h-4${c}`} style={royalBlue ? { color: PRIMARY_BG_FLAT } : undefined} />;
        if (type === 'balloon') return <MessageCircle className={`w-4 h-4${c}`} style={royalBlue ? { color: PRIMARY_BG_FLAT } : undefined} />;
        if (type === 'group') return <BoxSelect className={`w-4 h-4${c}`} style={royalBlue ? { color: PRIMARY_BG_FLAT } : undefined} />;
        return <PenTool className={`w-4 h-4${c}`} style={royalBlue ? { color: PRIMARY_BG_FLAT } : undefined} />;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={onSelect}
            onContextMenu={onContextMenu}
            className={`flex items-center justify-between p-2 mb-1 rounded-md cursor-pointer border select-none ${
                royalBlue
                    ? isSelected ? 'bg-[#002366]/15 border-[#002366]/50' : 'bg-[#002366]/5 border-transparent hover:bg-[#002366]/10'
                    : isSelected ? 'bg-white/10 border-gold-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'
            }`}
        >
            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                {/* Drag handle only: listeners not on row so eye/lock clicks are not captured by DnD */}
                <button
                    type="button"
                    className="flex-shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing touch-none"
                    style={royalBlue ? { color: PRIMARY_BG_FLAT } : undefined}
                    aria-label="Drag to reorder"
                    {...listeners}
                >
                    <GripVertical className={`w-4 h-4 ${royalBlue ? '' : 'text-white/50'}`} />
                </button>
                {type === 'group' && onToggleExpand && (
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleExpand(); }} className="flex-shrink-0 p-0.5 rounded hover:bg-white/10" aria-label={isExpanded ? 'Collapse group' : 'Expand group'}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                )}
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <span className={`text-sm font-medium truncate ${royalBlue ? 'text-inherit' : 'text-white/90'}`}>
                    {name}
                </span>
            </div>

            {type !== 'group' && (
            <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`p-1.5 rounded transition-colors ${royalBlue ? 'hover:bg-[#002366]/10 ' + (!isVisible ? 'opacity-50' : '') : 'hover:bg-white/10 ' + (!isVisible ? 'text-white/40' : 'text-white/80')}`}
                    style={royalBlue ? { color: PRIMARY_BG_FLAT } : undefined}
                    aria-label={isVisible ? 'Hide layer' : 'Show layer'}
                >
                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleLock(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`p-1.5 rounded transition-colors ${royalBlue ? 'hover:bg-[#002366]/10 ' + (isLocked ? 'opacity-80' : 'opacity-50') : 'hover:bg-white/10 ' + (isLocked ? 'text-red-400' : 'text-white/40 hover:text-white/80')}`}
                    style={royalBlue && !isLocked ? { color: PRIMARY_BG_FLAT } : royalBlue && isLocked ? { color: '#002366' } : undefined}
                    aria-label={isLocked ? 'Unlock layer' : 'Lock layer'}
                >
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
            </div>
            )}
        </div>
    );
};

export const LayerTree: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    /** When true, render only inner content for use inside ComicPanelStack (no fixed wrapper, no header). */
    embedded?: boolean;
}> = ({ isOpen, onClose, embedded }) => {
    const {
        pages,
        currentPageId,
        selectedElementIds,
        setSelectedElements,
        toggleSelection,
        reorderLayer,
        reorderGroup,
        toggleLayerVisibility,
        toggleLayerLock,
        createGroup,
        ungroup,
        getGroupMembers
    } = useComicStore();

    const [layerMenu, setLayerMenu] = useState<{ x: number; y: number } | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const layerMenuRef = useRef<HTMLDivElement>(null);

    const currentPage = pages.find(p => p.id === currentPageId);

    const toggleGroupExpanded = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const canShowGroup = currentPage && selectedElementIds.length >= 2 && elementsOverlapOrNear(currentPage, selectedElementIds);
    const groupOfFirst = currentPageId && selectedElementIds[0] ? getGroupMembers(currentPageId, selectedElementIds[0]) : null;
    const canShowUngroup = !!(currentPageId && selectedElementIds.length === 1 && groupOfFirst && groupOfFirst.length >= 2);

    useEffect(() => {
        if (!layerMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (layerMenuRef.current && !layerMenuRef.current.contains(e.target as Node)) setLayerMenu(null);
        };
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setLayerMenu(null); };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [layerMenu]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Requires 5px movement to start drag, allowing clicks to pass through
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Build tree: top-level = ungrouped elements + one row per group (frontmost member id = row id)
    type LayerItem = { id: string; name: string; type: 'panel' | 'balloon' | 'drawing' | 'group'; isLocked: boolean; isVisible: boolean; memberIds?: string[]; childrenDetails?: { id: string; name: string; type: 'panel' | 'balloon' | 'drawing' }[] };
    const resolveDetails = (page: typeof currentPage, mid: string): { id: string; name: string; type: 'panel' | 'balloon' | 'drawing' } | null => {
        if (!page) return null;
        const panel = page.panels.find(p => p.id === mid);
        if (panel) return { id: mid, name: `Panel ${panel.shapeType}`, type: 'panel' };
        const balloon = page.balloons.find(b => b.id === mid);
        if (balloon) return { id: mid, name: balloon.text ? `"${balloon.text.substring(0, 10)}${balloon.text.length > 10 ? '...' : ''}"` : 'Balloon', type: 'balloon' };
        const drawing = page.drawings?.find(d => d.id === mid);
        if (drawing) return { id: mid, name: 'Drawing Path', type: 'drawing' };
        return null;
    };

    const items = useMemo((): LayerItem[] => {
        if (!currentPage || !currentPageId) return [];

        const reversedOrder = [...currentPage.layerOrder].reverse();
        const seenInGroup = new Set<string>();
        const result: LayerItem[] = [];

        for (const id of reversedOrder) {
            if (seenInGroup.has(id)) continue;

            const group = getGroupMembers(currentPageId, id);
            if (group && group.length >= 2) {
                group.forEach(m => seenInGroup.add(m));
                const childrenDetails = group.map(mid => resolveDetails(currentPage, mid)).filter((c): c is { id: string; name: string; type: 'panel' | 'balloon' | 'drawing' } => c !== null);
                result.push({
                    id,
                    name: `Group (${group.length})`,
                    type: 'group',
                    isLocked: false,
                    isVisible: true,
                    memberIds: group,
                    childrenDetails,
                });
            } else {
                const details = resolveDetails(currentPage, id);
                if (details) {
                    const panel = currentPage.panels.find(p => p.id === id);
                    const balloon = currentPage.balloons.find(b => b.id === id);
                    const drawing = currentPage.drawings?.find(d => d.id === id);
                    const isLocked = panel?.isLocked ?? balloon?.isLocked ?? drawing?.isLocked ?? false;
                    const isVisible = panel?.isVisible ?? balloon?.isVisible ?? drawing?.isVisible ?? true;
                    result.push({ ...details, isLocked, isVisible });
                }
            }
        }
        return result;
    }, [currentPage, currentPageId, getGroupMembers]);

    if (!currentPage) return null;
    if (!isOpen && !embedded) return null;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !currentPage) return;

        const activeId = active.id as string;
        const overId = over.id as string;
        const group = getGroupMembers(currentPage.id, activeId);
        if (group && group.length >= 2) {
            reorderGroup(currentPage.id, activeId, overId);
        } else {
            reorderLayer(currentPage.id, activeId, overId);
        }
    };

    const content = (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
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
                            <React.Fragment key={item.id}>
                                <SortableLayerItem
                                    id={item.id}
                                    name={item.name}
                                    type={item.type}
                                    isLocked={item.isLocked}
                                    isVisible={item.isVisible}
                                    isSelected={item.type === 'group' && item.memberIds
                                        ? item.memberIds.length === selectedElementIds.length && item.memberIds.every(m => selectedElementIds.includes(m))
                                        : selectedElementIds.includes(item.id)}
                                    onToggleVisibility={() => toggleLayerVisibility(currentPage.id, item.id)}
                                    onToggleLock={() => toggleLayerLock(currentPage.id, item.id)}
                                    onSelect={(e) => {
                                        if (e.shiftKey) {
                                            toggleSelection(item.id);
                                        } else if (item.type === 'group' && item.memberIds) {
                                            setSelectedElements(item.memberIds);
                                        } else {
                                            setSelectedElements([item.id]);
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (item.type === 'group' && item.memberIds && !item.memberIds.every(m => selectedElementIds.includes(m))) {
                                            setSelectedElements(item.memberIds);
                                        } else if (item.type !== 'group' && !selectedElementIds.includes(item.id)) {
                                            setSelectedElements([item.id]);
                                        }
                                        setLayerMenu({ x: e.clientX, y: e.clientY });
                                    }}
                                    royalBlue={embedded}
                                    isExpanded={item.type === 'group' ? expandedGroups.has(item.id) : undefined}
                                    onToggleExpand={item.type === 'group' ? () => toggleGroupExpanded(item.id) : undefined}
                                />
                                {item.type === 'group' && expandedGroups.has(item.id) && item.childrenDetails && (
                                    <div className="ml-6 mt-0 mb-1 space-y-0 border-l-2 border-white/10 pl-2">
                                        {item.childrenDetails.map(child => (
                                            <div
                                                key={child.id}
                                                onClick={(e) => { e.stopPropagation(); if (e.shiftKey) toggleSelection(child.id); else setSelectedElements([child.id]); }}
                                                className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm ${selectedElementIds.includes(child.id) ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                            >
                                                {child.type === 'panel' && <Square className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                                                {child.type === 'balloon' && <MessageCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                                                {child.type === 'drawing' && <PenTool className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                                                <span className="truncate">{child.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                        {items.length === 0 && (
                            <div className={`text-center py-8 text-sm ${embedded ? 'text-inherit opacity-60' : 'text-white/40'}`}>
                                No layers yet.<br />Add a panel or balloon to start.
                            </div>
                        )}
                    </SortableContext>
                </DndContext>
                {layerMenu && (canShowGroup || canShowUngroup) && (
                    <div
                        ref={layerMenuRef}
                        className="fixed z-[200] min-w-[160px] rounded-lg shadow-2xl border border-white/15 overflow-hidden py-1"
                        style={{ left: layerMenu.x, top: layerMenu.y, background: ACCENT_GOLD_GRADIENT }}
                        role="menu"
                    >
                        {canShowGroup && (
                            <button
                                type="button"
                                onClick={() => { currentPageId && createGroup(currentPageId, selectedElementIds); setLayerMenu(null); }}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 rounded transition-colors text-[#001a4d] hover:bg-[#002366] hover:text-[#fcf6ba]"
                            >
                                <BoxSelect size={12} /> Group
                            </button>
                        )}
                        {canShowUngroup && (
                            <button
                                type="button"
                                onClick={() => { currentPageId && selectedElementIds[0] && ungroup(currentPageId, selectedElementIds[0]); setLayerMenu(null); }}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 rounded transition-colors text-[#001a4d] hover:bg-[#002366] hover:text-[#fcf6ba]"
                            >
                                <BoxSelect size={12} /> Ungroup
                            </button>
                        )}
                    </div>
                )}
        </div>
    );

    if (embedded) {
        return <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{content}</div>;
    }

    return (
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-[#1A1A1E] border-l border-white/[0.08] shadow-2xl z-40 flex flex-col">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0F0F12]/80">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#00D1FF] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00D1FF]" />
                    Layers
                </h2>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors text-xl leading-none">
                    &times;
                </button>
            </div>
            {content}
        </div>
    );
};
