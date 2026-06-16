class DashboardGrid {
  constructor(gridEl) {
    this.grid = gridEl;
    this.KEY = 'dashboard-layout';
    this.columns = 2;
    this.resizeState = null;
    this.init();
  }

  async init() {
    await this.load();
    this.render();
    this.bindDrag();
    this.bindResize();
    this.bindControls();
  }

  render() {
    this.grid.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`;
    this.grid.querySelectorAll('.card').forEach((card) => {
      const span = parseInt(card.dataset.colspan, 10) || 1;
      card.style.gridColumn = `span ${Math.min(span, this.columns)}`;
    });
  }

  // ─── Drag ──────────────────────────────────────────────────

  bindDrag() {
    this.grid.querySelectorAll('.card-header').forEach((h) => {
      h.draggable = true;
      h.addEventListener('dragstart', this.onDragStart.bind(this));
    });
    this.grid.addEventListener('dragover', this.onDragOver.bind(this));
    this.grid.addEventListener('drop', this.onDrop.bind(this));
    this.grid.addEventListener('dragend', this.onDragEnd.bind(this));
  }

  onDragStart(e) {
    const card = e.target.closest('.card');
    if (!card) return;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.card);
  }

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.target.closest('.card');
    if (card && !card.classList.contains('dragging')) {
      card.classList.add('drag-over');
    }
  }

  onDrop(e) {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain');
    const from = this.grid.querySelector(`[data-card="${fromId}"]`);
    const to = e.target.closest('.card');
    if (from && to && from !== to) {
      const rect = to.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        this.grid.insertBefore(from, to);
      } else {
        this.grid.insertBefore(from, to.nextSibling);
      }
      this.save();
    }
  }

  onDragEnd() {
    this.grid.querySelectorAll('.dragging, .drag-over').forEach((el) => {
      el.classList.remove('dragging', 'drag-over');
    });
  }

  // ─── Resize ────────────────────────────────────────────────

  bindResize() {
    this.grid.querySelectorAll('.resize-handle').forEach((h) => {
      h.addEventListener('mousedown', this.onResizeStart.bind(this));
    });
    document.addEventListener('mousemove', this.onResizeMove.bind(this));
    document.addEventListener('mouseup', this.onResizeEnd.bind(this));
  }

  onResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.target;
    const card = handle.closest('.card');
    if (!card) return;
    handle.classList.add('resizing');
    const rect = this.grid.getBoundingClientRect();
    const colWidth = rect.width / this.columns;
    this.resizeState = {
      card,
      handle,
      startX: e.clientX,
      colWidth,
      span: parseInt(card.dataset.colspan, 10) || 1,
    };
  }

  onResizeMove(e) {
    if (!this.resizeState) return;
    const { card, startX, colWidth, span } = this.resizeState;
    const dx = e.clientX - startX;
    const delta = Math.round(dx / colWidth);
    const newSpan = Math.max(1, Math.min(this.columns, span + delta));
    card.dataset.colspan = newSpan;
    card.style.gridColumn = `span ${newSpan}`;
  }

  onResizeEnd() {
    if (!this.resizeState) return;
    this.resizeState.handle.classList.remove('resizing');
    this.resizeState = null;
    this.save();
  }

  // ─── Grid controls ─────────────────────────────────────────

  bindControls() {
    const input = document.getElementById('grid-columns');
    if (!input) return;
    input.value = this.columns;
    input.addEventListener('change', () => {
      this.columns = Math.max(1, Math.min(6, parseInt(input.value, 10) || 2));
      input.value = this.columns;
      this.render();
      this.save();
    });
  }

  // ─── Persistence ───────────────────────────────────────────

  async save() {
    const order = [...this.grid.children].map((c) => c.dataset.card);
    const sizes = {};
    this.grid.querySelectorAll('.card').forEach((c) => {
      sizes[c.dataset.card] = parseInt(c.dataset.colspan, 10) || 1;
    });
    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, columns: this.columns, sizes }),
      });
    } catch {}
  }

  async load() {
    try {
      const res = await fetch('/api/layout');
      const data = await res.json();
      if (!data || !data.columns) return;
      this.columns = data.columns;
      if (data.order) {
        data.order.forEach((id) => {
          const card = this.grid.querySelector(`[data-card="${id}"]`);
          if (card) this.grid.appendChild(card);
        });
      }
      if (data.sizes) {
        Object.entries(data.sizes).forEach(([id, span]) => {
          const card = this.grid.querySelector(`[data-card="${id}"]`);
          if (card) {
            card.dataset.colspan = span;
          }
        });
      }
    } catch {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.dashboard-grid');
  if (grid) new DashboardGrid(grid);
});
