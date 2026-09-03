import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import type { CodexTextObject } from '../types/codexObjects';

interface TextEditorOverlayProps {
  object: CodexTextObject;
  stage: Konva.Stage;
  scale: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

/**
 * Edits a text object in place, on the canvas.
 *
 * Konva has no editable text node, so the standard approach is to float a real
 * `<textarea>` over the shape while editing and write the value back on commit.
 * The alternative — sending people to a field in a side panel — is what made
 * adding text feel broken: you click Add Text, get a caret-less box, type, and
 * nothing happens.
 *
 * The textarea mirrors the object's typography so the text does not visibly
 * jump between editing and rendered states.
 */
export function TextEditorOverlay({
  object,
  stage,
  scale,
  onCommit,
  onCancel,
}: TextEditorOverlayProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(object.text);
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(null);

  // Position against the stage container, measured after layout so the overlay
  // cannot land a frame behind the canvas it is covering.
  useLayoutEffect(() => {
    const container = stage.container();
    const rect = container.getBoundingClientRect();
    setBox({
      left: rect.left + object.x * scale,
      top: rect.top + object.y * scale,
      width: Math.max(40, object.width * scale),
    });
  }, [stage, object.x, object.y, object.width, scale]);

  // Focus once the textarea actually exists. On mount it does not: rendering is
  // gated on `box`, which is measured in a layout effect, so a mount-only focus
  // effect runs against a null ref and silently does nothing — leaving the very
  // caret this component exists to provide.
  const focused = useRef(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || focused.current) return;
    focused.current = true;
    node.focus();
    node.select();
  }, [box]);

  if (!box) return null;

  const commit = () => onCommit(value);

  return (
    <textarea
      ref={ref}
      value={value}
      aria-label="Edit text"
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Enter commits, Shift+Enter is a line break — the convention for a
        // single-value editor rather than a document.
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        // Everything else stays local: the portal's global shortcuts must not
        // fire while someone is typing a "t" or pressing Delete mid-word.
        e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        left: box.left,
        top: box.top,
        width: box.width,
        // Mirror the object's typography so committing does not shift the text.
        fontFamily: object.fontFamily,
        fontSize: object.fontSize * scale,
        lineHeight: object.lineHeight,
        letterSpacing: object.letterSpacing * scale,
        color: object.fill,
        textAlign: object.align,
        textTransform: object.textTransform === 'uppercase' ? 'uppercase' : 'none',
        fontWeight: object.fontStyle.includes('bold') ? 700 : 400,
        fontStyle: object.fontStyle.includes('italic') ? 'italic' : 'normal',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(216,180,90,0.9)',
        borderRadius: 2,
        outline: 'none',
        padding: 0,
        margin: 0,
        overflow: 'hidden',
        resize: 'none',
        zIndex: 50,
        minHeight: object.fontSize * object.lineHeight * scale,
      }}
    />
  );
}
