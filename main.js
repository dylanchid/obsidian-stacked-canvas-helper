// Canvas caches its wrapper's bounding rect (canvas.canvasRect) and only refreshes it
// from a ResizeObserver. Stacked tabs move a leaf by scrolling/sticky-positioning, which
// fires no resize, so cx/cy go stale and every pointer->canvas conversion
// (wheel-zoom anchor, paste, drop) is offset. We re-measure just before Obsidian reads it.
const { Plugin, Notice } = require("obsidian");

// mirrors Obsidian's internal v9(el)
function measure(el) {
  const r = el.getBoundingClientRect();
  const left = r.left + el.clientLeft, top = r.top + el.clientTop;
  const width = el.clientWidth, height = el.clientHeight;
  return { left, top, width, height, cx: left + width / 2, cy: top + height / 2,
           minX: -width / 2, minY: -height / 2, maxX: width / 2, maxY: height / 2 };
}

module.exports = class StackedCanvasHelper extends Plugin {
  onload() {
    const opts = { capture: true, passive: true };
    // Capture phase on document runs before Canvas's own handlers.
    for (const type of ["wheel", "pointermove", "pointerdown", "mousemove", "paste", "dragover", "drop", "keydown"]) {
      this.registerDomEvent(document, type, (e) => this.syncForEvent(e), opts);
    }
    // Stack scrolling (scroll doesn't bubble, so capture)
    this.registerDomEvent(document, "scroll", () => this.scheduleSyncAll(), opts);
    this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleSyncAll()));

    this.addCommand({
      id: "report-canvas-rect-drift",
      name: "Report canvas rect drift (debug)",
      callback: () => {
        const rows = this.canvases().map(({ canvas }) => {
          const fresh = measure(canvas.wrapperEl);
          return `dx=${(fresh.cx - canvas.canvasRect.cx).toFixed(1)} dy=${(fresh.cy - canvas.canvasRect.cy).toFixed(1)}`;
        });
        new Notice(rows.length ? rows.join("\n") : "No open canvases");
        console.log("[stacked-canvas-helper] drift", rows);
      },
    });
  }

  canvases() {
    const out = [];
    this.app.workspace.iterateAllLeaves((leaf) => {
      const v = leaf.view;
      if (v && v.getViewType && v.getViewType() === "canvas" && v.canvas && v.canvas.wrapperEl) out.push({ leaf, canvas: v.canvas });
    });
    return out;
  }

  sync(canvas) {
    const old = canvas.canvasRect, fresh = measure(canvas.wrapperEl);
    if (!old || old.cx !== fresh.cx || old.cy !== fresh.cy || old.width !== fresh.width || old.height !== fresh.height) {
      canvas.canvasRect = fresh;
    }
  }

  syncForEvent(e) {
    const t = e.target;
    if (!(t instanceof Node)) return;
    for (const { leaf, canvas } of this.canvases()) {
      // Paste/keydown may target body; fall back to the active canvas.
      if (leaf.view.containerEl.contains(t) || (leaf === this.app.workspace.activeLeaf && !(t instanceof Element && t.closest(".workspace-leaf")))) {
        this.sync(canvas);
      }
    }
  }

  scheduleSyncAll() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.canvases().forEach(({ canvas }) => this.sync(canvas));
    });
  }
};
