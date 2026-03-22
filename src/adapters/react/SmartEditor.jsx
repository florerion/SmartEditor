import React, { useEffect, useRef } from 'react';
import { createEditor } from '../../index.js';

/**
 * React wrapper for the vanilla editor.
 *
 * @example
 * <SmartEditor
 *   value="# Hello"
 *   options={{ mode: 'split' }}
 *   onReady={(editor) => console.log(editor)}
 * />
 */
export function SmartEditor({ value = '', options = {}, onReady, className, style }) {
  const rootRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!rootRef.current) return;
    editorRef.current = createEditor(rootRef.current, { ...options, value });
    onReady?.(editorRef.current);

    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // options should be memoized by the host app if dynamic
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== editorRef.current.getMarkdown()) {
      editorRef.current.setMarkdown(value, { undoable: false });
    }
  }, [value]);

  return <div ref={rootRef} className={className} style={style} />;
}
