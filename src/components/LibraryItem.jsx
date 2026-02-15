import { useRef, useEffect, useCallback } from 'react';

export default function LibraryItem({ item, onRemove }) {
  const canvasRef = useRef(null);
  const touchGhostRef = useRef(null);

  useEffect(() => {
    drawWaveform(canvasRef.current, item.audioBuffer);
  }, [item.audioBuffer]);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('soundId', String(item.id));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Touch drag: create a floating ghost element and dispatch a custom event on drop
  const handleTouchStart = useCallback((e) => {
    // Don't interfere with the remove button
    if (e.target.closest('.library-item-remove')) return;

    const touch = e.touches[0];

    // Create ghost element
    const ghost = document.createElement('div');
    ghost.className = 'touch-drag-ghost';
    ghost.textContent = item.name;
    ghost.style.left = `${touch.clientX}px`;
    ghost.style.top = `${touch.clientY}px`;
    document.body.appendChild(ghost);
    touchGhostRef.current = ghost;

    const handleTouchMove = (ev) => {
      ev.preventDefault();
      const t = ev.touches[0];
      ghost.style.left = `${t.clientX}px`;
      ghost.style.top = `${t.clientY}px`;
    };

    const handleTouchEnd = (ev) => {
      const t = ev.changedTouches[0];
      // Find the mixer field element at the drop point
      ghost.style.display = 'none'; // hide ghost so elementFromPoint finds the field
      const target = document.elementFromPoint(t.clientX, t.clientY);
      ghost.remove();
      touchGhostRef.current = null;

      if (target) {
        const mixerField = target.closest('.mixer-field');
        if (mixerField) {
          // Dispatch custom event with sound data and coordinates
          mixerField.dispatchEvent(new CustomEvent('touchdrop', {
            bubbles: false,
            detail: { soundId: item.id, clientX: t.clientX, clientY: t.clientY },
          }));
        }
      }

      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }, [item.id, item.name]);

  return (
    <div
      className="library-item"
      draggable
      onDragStart={handleDragStart}
      onTouchStart={handleTouchStart}
    >
      <canvas ref={canvasRef} className="waveform-canvas" width={120} height={32} />
      <span className="library-item-name">{item.name}</span>
      <button className="library-item-remove" onClick={onRemove}>×</button>
    </div>
  );
}

function drawWaveform(canvas, audioBuffer) {
  if (!canvas || !audioBuffer) return;
  const ctx = canvas.getContext('2d');
  const data = audioBuffer.getChannelData(0);
  const width = canvas.width;
  const height = canvas.height;
  const step = Math.ceil(data.length / width);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f0f0f5';
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  ctx.strokeStyle = '#d4a810';
  ctx.lineWidth = 1;

  const mid = height / 2;
  for (let i = 0; i < width; i++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const idx = i * step + j;
      if (idx < data.length) {
        if (data[idx] < min) min = data[idx];
        if (data[idx] > max) max = data[idx];
      }
    }
    ctx.moveTo(i, mid + min * mid);
    ctx.lineTo(i, mid + max * mid);
  }
  ctx.stroke();
}
