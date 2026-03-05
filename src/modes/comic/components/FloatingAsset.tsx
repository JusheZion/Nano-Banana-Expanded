import React, { useRef, useEffect } from 'react';
import { Group, Image, Transformer } from 'react-konva';
import useImage from 'use-image';
import type { OverlayObject } from '../../../stores/comicStore';

const DEFAULT_SIZE = 120;

interface FloatingAssetProps {
    overlay: OverlayObject;
    pageId: string;
    isSelected: boolean;
    onSelect: (e?: any) => void;
    onUpdate: (updates: Partial<OverlayObject>) => void;
}

export const FloatingAsset: React.FC<FloatingAssetProps> = ({
    overlay,
    isSelected,
    onSelect,
    onUpdate
}) => {
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);
    const [image] = useImage(overlay.src || '', 'anonymous');

    useEffect(() => {
        if (!trRef.current || !groupRef.current) return;
        if (isSelected) {
            trRef.current.nodes([groupRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Group
                ref={groupRef}
                x={overlay.x}
                y={overlay.y}
                rotation={overlay.rotation}
                scaleX={overlay.scaleX}
                scaleY={overlay.scaleY}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={(e) => {
                    const node = e.target;
                    onUpdate({ x: node.x(), y: node.y() });
                }}
                onTransformEnd={() => {
                    const node = groupRef.current;
                    if (!node) return;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onUpdate({
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        scaleX,
                        scaleY
                    });
                }}
            >
                <Image
                    image={image}
                    width={DEFAULT_SIZE}
                    height={DEFAULT_SIZE}
                    offset={{ x: DEFAULT_SIZE / 2, y: DEFAULT_SIZE / 2 }}
                    listening={!isSelected}
                />
            </Group>
            {isSelected && (
                <Transformer
                    ref={trRef}
                    rotateEnabled
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                    borderStroke="#00D1FF"
                    anchorStroke="#00D1FF"
                    anchorFill="#0F0F12"
                    borderStrokeWidth={1.5}
                />
            )}
        </>
    );
};
