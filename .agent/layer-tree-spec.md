🏗️ Technical Spec: The Layer Tree & Z-Index Manager
Objective: Create a sidebar UI that manages the Z-index, visibility, and editability of Konva Stage elements.

1. Data Mapping
The Mirror Rule: The Layer Tree is a visual representation of the elements array.

Z-Index Sync: Items at the top of the list in the UI must correspond to the highest Z-index (the front) in Konva.

Selection: Highlighting an item in the tree must sync with the selectedElementIds in the store.

2. Item Controls (The Icon Toggles)
Each layer entry must feature two critical status toggles:

Visibility (Eye Icon): Maps to Konva’s visible property. When off, the node is hidden but remains in the DOM/State.

Lock (Padlock Icon): Maps to Konva’s listening and draggable properties.

Effect: When locked, the user cannot select or move the element on the canvas. This is essential for preventing accidental movement of background panels while editing foreground balloons.

3. Drag-and-Drop Reordering
Use a library like dnd-kit to allow vertical reordering of the layers.

On onDragEnd, the Agent must update the index of the element in the store’s array to reflect its new visual depth.

4. Component Structure

interface LayerItemProps {
  id: string;
  name: string; // e.g., "Speech Bubble (Round)"
  type: 'panel' | 'balloon' | 'image';
  isLocked: boolean;
  isVisible: boolean;
  isSelected: boolean;
}