export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const CANVAS_ASPECT = '16:9';

const MIN_SIZE = 10;
const DEFAULT_GRID = 10;
const HANDLE_SIZE = 10;
const DEFAULT_INSTANCE = {
  width: 260,
  height: 160,
  x: 120,
  y: 120,
  z: 0,
  color: '#e8bf52',
  notes: '',
};

export function createBlankDocument() {
  return {
    version: 1,
    canvas: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      aspect: CANVAS_ASPECT,
    },
    instances: [],
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function createEditor({ onBack, onDocumentChange, ui: initialUi = {} } = {}) {
  const canvas = document.getElementById('editorCanvas');
  const ctx = canvas.getContext('2d');
  const gridInput = document.getElementById('gridInput');
  const createBtn = document.getElementById('createBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const exportBtn = document.getElementById('exportBtn');
  const copyBtn = document.getElementById('copyBtn');
  const statusText = document.getElementById('statusText');
  const selectionInfo = document.getElementById('selectionInfo');
  const labelInput = document.getElementById('labelInput');
  const notesInput = document.getElementById('notesInput');
  const xInput = document.getElementById('xInput');
  const yInput = document.getElementById('yInput');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const zInput = document.getElementById('zInput');
  const colorInput = document.getElementById('colorInput');
  const bringForwardBtn = document.getElementById('bringForwardBtn');
  const sendBackwardBtn = document.getElementById('sendBackwardBtn');
  const layerList = document.getElementById('layerList');
  const sortAscBtn = document.getElementById('sortAscBtn');
  const instanceCountMeta = document.getElementById('instanceCountMeta');
  const selectionMeta = document.getElementById('selectionMeta');
  const canvasMeta = document.getElementById('canvasMeta');
  const homeBtn = document.getElementById('homeBtn');

  let ui = initialUi;

  const state = {
    grid: Number(gridInput?.value) || DEFAULT_GRID,
    document: createBlankDocument(),
    selectedId: null,
    drag: null,
    nextId: 1,
  };

  function setStatus(text) {
    statusText.textContent = text;
  }

  function resolvePath(object, path) {
    return path.split('.').reduce((acc, key) => (
      acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined
    ), object);
  }

  function fmt(template, values = {}) {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? ''));
  }

  function tr(path, fallback = '') {
    const value = resolvePath(ui, path);
    return typeof value === 'string' ? value : fallback;
  }

  function setLocale(nextUi) {
    ui = nextUi || ui;
    syncUi();
  }

  function getGridSize() {
    return Math.max(2, Number(state.grid) || DEFAULT_GRID);
  }

  function snap(value) {
    const grid = getGridSize();
    return Math.round(value / grid) * grid;
  }

  function getCanvasScale() {
    return canvas.width / CANVAS_WIDTH;
  }

  function getSortedInstancesAsc() {
    return [...state.document.instances].sort((a, b) => {
      if (a.z !== b.z) return a.z - b.z;
      return a._order - b._order;
    });
  }

  function getLayerListOrder() {
    return [...getSortedInstancesAsc()].reverse();
  }

  function getSelectedInstance() {
    return state.document.instances.find((instance) => instance.id === state.selectedId) || null;
  }

  function updateNextIdSeed() {
    const maxId = state.document.instances.reduce((max, instance) => {
      const match = /instance_(\d+)/.exec(instance.id);
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 0);
    state.nextId = maxId + 1;
  }

  function drawGrid(scale) {
    const grid = getGridSize();
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= CANVAS_WIDTH; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, CANVAS_HEIGHT * scale);
      ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(CANVAS_WIDTH * scale, y * scale);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCanvasFrame(scale) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_WIDTH * scale - 2, CANVAS_HEIGHT * scale - 2);
    ctx.restore();
  }

  function drawHandles(x, y, width, height) {
    const half = HANDLE_SIZE / 2;
    const handles = [
      { x, y },
      { x: x + width, y },
      { x, y: y + height },
      { x: x + width, y: y + height },
    ];

    ctx.save();
    ctx.fillStyle = 'rgba(60, 130, 246, 0.95)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    handles.forEach((handle) => {
      ctx.beginPath();
      ctx.rect(handle.x - half, handle.y - half, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawInstance(instance, isSelected, scale) {
    const x = instance.x * scale;
    const y = instance.y * scale;
    const width = instance.width * scale;
    const height = instance.height * scale;
    ctx.save();
    ctx.fillStyle = instance.color || DEFAULT_INSTANCE.color;
    ctx.strokeStyle = isSelected ? 'rgba(60, 130, 246, 0.95)' : 'rgba(0, 0, 0, 0.42)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.font = `${Math.max(12, 14 * scale)}px sans-serif`;
    ctx.fillText(instance.label || instance.id, x + 8, y + 20);
    ctx.fillText(`#${instance.z}`, x + 8, y + Math.min(height - 8, 38));

    if (isSelected) {
      drawHandles(x, y, width, height);
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = getCanvasScale();
    drawGrid(scale);
    drawCanvasFrame(scale);

    const sorted = getSortedInstancesAsc();
    sorted.forEach((instance) => {
      drawInstance(instance, instance.id === state.selectedId, scale);
    });
  }

  function resizeCanvas() {
    const wrapper = canvas.parentElement;
    const maxWidth = Math.max(320, wrapper.clientWidth - 28);
    const maxHeight = Math.max(240, window.innerHeight - 280);
    const scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT, 1);
    canvas.width = Math.round(CANVAS_WIDTH * scale);
    canvas.height = Math.round(CANVAS_HEIGHT * scale);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    draw();
  }

  function updateMeta() {
    canvasMeta.textContent = `${tr('editor.meta.canvasPrefix', 'Canvas:')} ${CANVAS_WIDTH} x ${CANVAS_HEIGHT}`;
    instanceCountMeta.textContent = `${tr('editor.meta.instancePrefix', 'Instances:')} ${state.document.instances.length}`;
    const selected = getSelectedInstance();
    selectionMeta.textContent = selected
      ? `${tr('editor.meta.selectedPrefix', 'Selected:')} ${selected.label || selected.id}`
      : tr('editor.meta.selectedNone', 'Selected: none');
  }

  function setInputsDisabled(disabled) {
    [
      labelInput,
      notesInput,
      xInput,
      yInput,
      widthInput,
      heightInput,
      zInput,
      colorInput,
      deleteBtn,
      bringForwardBtn,
      sendBackwardBtn,
    ].forEach((element) => {
      element.disabled = disabled;
    });
  }

  function summarizeNotes(notes) {
    const clean = String(notes || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '-';
    if (clean.length <= 60) return clean;
    return `${clean.slice(0, 57)}...`;
  }

  function updateSelectionInfo() {
    const selected = getSelectedInstance();
    const values = selected
      ? [
        selected.id,
        selected.label,
        summarizeNotes(selected.notes),
        selected.color,
        selected.x,
        selected.y,
        selected.width,
        selected.height,
        selected.z,
      ]
      : ['-', '-', '-', '-', '-', '-', '-', '-', '-'];
    const cells = selectionInfo.querySelectorAll('div');
    for (let index = 0; index < cells.length; index += 2) {
      cells[index + 1].textContent = String(values[index / 2] ?? '-');
    }
  }

  function updatePropertyInputs() {
    const selected = getSelectedInstance();
    const disabled = !selected;
    setInputsDisabled(disabled);

    if (!selected) {
      labelInput.value = '';
      notesInput.value = '';
      xInput.value = '';
      yInput.value = '';
      widthInput.value = '';
      heightInput.value = '';
      zInput.value = '';
      colorInput.value = DEFAULT_INSTANCE.color;
      return;
    }

    labelInput.value = selected.label;
    notesInput.value = selected.notes || '';
    xInput.value = String(selected.x);
    yInput.value = String(selected.y);
    widthInput.value = String(selected.width);
    heightInput.value = String(selected.height);
    zInput.value = String(selected.z);
    colorInput.value = selected.color || DEFAULT_INSTANCE.color;
  }

  function renderLayerList() {
    layerList.innerHTML = '';
    const instances = getLayerListOrder();
    if (instances.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = tr('editor.layers.empty', 'There are no instances yet. Create one to get started.');
      layerList.appendChild(empty);
      return;
    }

    instances.forEach((instance) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `layer-item${instance.id === state.selectedId ? ' is-selected' : ''}`;
      item.dataset.instanceId = instance.id;

      const main = document.createElement('div');
      main.className = 'layer-main';

      const title = document.createElement('div');
      title.className = 'layer-title';
      title.textContent = instance.label || instance.id;

      const subtitle = document.createElement('div');
      subtitle.className = 'layer-subtitle';
      subtitle.textContent = `${instance.id} · ${instance.width}x${instance.height} · (${instance.x}, ${instance.y})`;

      const badge = document.createElement('span');
      badge.className = 'badge layer-badge';

      const colorChip = document.createElement('span');
      colorChip.className = 'color-chip';
      colorChip.style.background = instance.color || DEFAULT_INSTANCE.color;

      const badgeText = document.createElement('span');
      badgeText.textContent = `z ${instance.z}`;

      main.appendChild(title);
      main.appendChild(subtitle);
      badge.appendChild(colorChip);
      badge.appendChild(badgeText);
      item.appendChild(main);
      item.appendChild(badge);

      item.addEventListener('click', () => {
        state.selectedId = instance.id;
        setStatus(fmt(tr('editor.status.selected', 'Selected {id}'), { id: instance.id }));
        syncUi();
      });

      layerList.appendChild(item);
    });
  }

  function syncUi() {
    updateMeta();
    updateSelectionInfo();
    updatePropertyInputs();
    renderLayerList();
    draw();
  }

  function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function hitTestRect(instance, mouse, scale) {
    const x = instance.x * scale;
    const y = instance.y * scale;
    const width = instance.width * scale;
    const height = instance.height * scale;
    return mouse.x >= x && mouse.x <= x + width && mouse.y >= y && mouse.y <= y + height;
  }

  function hitTestHandle(instance, mouse, scale) {
    const half = HANDLE_SIZE / 2;
    const handles = [
      { name: 'nw', x: instance.x * scale, y: instance.y * scale },
      { name: 'ne', x: (instance.x + instance.width) * scale, y: instance.y * scale },
      { name: 'sw', x: instance.x * scale, y: (instance.y + instance.height) * scale },
      { name: 'se', x: (instance.x + instance.width) * scale, y: (instance.y + instance.height) * scale },
    ];

    return handles.find((handle) => (
      mouse.x >= handle.x - half &&
      mouse.x <= handle.x + half &&
      mouse.y >= handle.y - half &&
      mouse.y <= handle.y + half
    )) || null;
  }

  function findTopmostInstanceAt(mouse) {
    const scale = getCanvasScale();
    const sortedDesc = [...getSortedInstancesAsc()].reverse();

    for (const instance of sortedDesc) {
      const handle = hitTestHandle(instance, mouse, scale);
      if (handle) {
        return { instance, mode: 'resize', handle: handle.name };
      }
    }

    for (const instance of sortedDesc) {
      if (hitTestRect(instance, mouse, scale)) {
        return { instance, mode: 'move', handle: null };
      }
    }

    return null;
  }

  function startDrag(instance, mode, handle, mouse) {
    state.drag = {
      instance,
      mode,
      handle,
      startMouse: mouse,
      startRect: {
        x: instance.x,
        y: instance.y,
        width: instance.width,
        height: instance.height,
      },
      scale: getCanvasScale(),
    };
  }

  function updateDrag(mouse) {
    if (!state.drag) return;

    const { instance, startMouse, startRect, mode, handle, scale } = state.drag;
    const deltaX = (mouse.x - startMouse.x) / scale;
    const deltaY = (mouse.y - startMouse.y) / scale;

    if (mode === 'move') {
      const nextX = clamp(snap(startRect.x + deltaX), 0, CANVAS_WIDTH - instance.width);
      const nextY = clamp(snap(startRect.y + deltaY), 0, CANVAS_HEIGHT - instance.height);
      instance.x = nextX;
      instance.y = nextY;
    }

    if (mode === 'resize') {
      let nextX = startRect.x;
      let nextY = startRect.y;
      let nextWidth = startRect.width;
      let nextHeight = startRect.height;

      if (handle === 'nw') {
        nextX = snap(startRect.x + deltaX);
        nextY = snap(startRect.y + deltaY);
        nextWidth = snap(startRect.width - deltaX);
        nextHeight = snap(startRect.height - deltaY);
      }

      if (handle === 'ne') {
        nextY = snap(startRect.y + deltaY);
        nextWidth = snap(startRect.width + deltaX);
        nextHeight = snap(startRect.height - deltaY);
      }

      if (handle === 'sw') {
        nextX = snap(startRect.x + deltaX);
        nextWidth = snap(startRect.width - deltaX);
        nextHeight = snap(startRect.height + deltaY);
      }

      if (handle === 'se') {
        nextWidth = snap(startRect.width + deltaX);
        nextHeight = snap(startRect.height + deltaY);
      }

      nextWidth = Math.max(MIN_SIZE, nextWidth);
      nextHeight = Math.max(MIN_SIZE, nextHeight);
      nextX = clamp(nextX, 0, CANVAS_WIDTH - nextWidth);
      nextY = clamp(nextY, 0, CANVAS_HEIGHT - nextHeight);
      nextWidth = clamp(nextWidth, MIN_SIZE, CANVAS_WIDTH - nextX);
      nextHeight = clamp(nextHeight, MIN_SIZE, CANVAS_HEIGHT - nextY);

      instance.x = nextX;
      instance.y = nextY;
      instance.width = nextWidth;
      instance.height = nextHeight;
    }

    updateSelectionInfo();
    updatePropertyInputs();
    renderLayerList();
    draw();
  }

  function exportDocument() {
    const instances = getSortedInstancesAsc().map(({ _order, ...instance }) => ({ ...instance }));
    return {
      version: state.document.version,
      canvas: { ...state.document.canvas },
      instances,
    };
  }

  function emitChange() {
    if (typeof onDocumentChange !== 'function') return;
    onDocumentChange(exportDocument());
  }

  function stopDrag() {
    if (!state.drag) return;
    state.drag = null;
    setStatus(tr('editor.status.changesReady', 'Changes ready to export.'));
    syncUi();
    emitChange();
  }

  function createInstance() {
    const nextIndex = state.nextId;
    state.nextId += 1;
    const selected = getSelectedInstance();
    const x = selected ? snap(selected.x + 40) : DEFAULT_INSTANCE.x;
    const y = selected ? snap(selected.y + 40) : DEFAULT_INSTANCE.y;
    const z = state.document.instances.length
      ? Math.max(...state.document.instances.map((instance) => instance.z)) + 1
      : DEFAULT_INSTANCE.z;

    const instance = {
      id: `instance_${String(nextIndex).padStart(3, '0')}`,
      label: `${tr('editor.instancePrefix', 'Instance')} ${String(nextIndex).padStart(3, '0')}`,
      notes: '',
      x: clamp(x, 0, CANVAS_WIDTH - DEFAULT_INSTANCE.width),
      y: clamp(y, 0, CANVAS_HEIGHT - DEFAULT_INSTANCE.height),
      width: DEFAULT_INSTANCE.width,
      height: DEFAULT_INSTANCE.height,
      z,
      color: DEFAULT_INSTANCE.color,
      _order: nextIndex,
    };

    state.document.instances.push(instance);
    state.selectedId = instance.id;
    setStatus(fmt(tr('editor.status.instanceCreated', 'Instance created: {id}'), { id: instance.id }));
    syncUi();
    emitChange();
  }

  function removeSelectedInstance() {
    const selected = getSelectedInstance();
    if (!selected) return;
    state.document.instances = state.document.instances.filter((instance) => instance.id !== selected.id);
    state.selectedId = state.document.instances[0]?.id ?? null;
    setStatus(fmt(tr('editor.status.instanceDeleted', 'Instance deleted: {id}'), { id: selected.id }));
    syncUi();
    emitChange();
  }

  function updateSelectedProperty(key, rawValue) {
    const selected = getSelectedInstance();
    if (!selected) return;

    if (key === 'label') {
      selected.label = String(rawValue || '').trim() || selected.id;
      setStatus(fmt(tr('editor.status.labelUpdated', 'Label updated for {id}'), { id: selected.id }));
      syncUi();
      emitChange();
      return;
    }

    if (key === 'notes') {
      selected.notes = String(rawValue || '').slice(0, 4000);
      setStatus(fmt(tr('editor.status.notesUpdated', 'Notes updated for {id}'), { id: selected.id }));
      syncUi();
      emitChange();
      return;
    }

    if (key === 'color') {
      selected.color = String(rawValue || '').trim() || DEFAULT_INSTANCE.color;
      setStatus(fmt(tr('editor.status.colorUpdated', 'Color updated for {id}'), { id: selected.id }));
      syncUi();
      emitChange();
      return;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      updatePropertyInputs();
      return;
    }

    if (key === 'x') {
      selected.x = clamp(snap(numericValue), 0, CANVAS_WIDTH - selected.width);
    }

    if (key === 'y') {
      selected.y = clamp(snap(numericValue), 0, CANVAS_HEIGHT - selected.height);
    }

    if (key === 'width') {
      selected.width = clamp(snap(numericValue), MIN_SIZE, CANVAS_WIDTH - selected.x);
    }

    if (key === 'height') {
      selected.height = clamp(snap(numericValue), MIN_SIZE, CANVAS_HEIGHT - selected.y);
    }

    if (key === 'z') {
      selected.z = Math.round(numericValue);
    }

    setStatus(fmt(tr('editor.status.propertyUpdated', 'Property {key} updated.'), { key }));
    syncUi();
    emitChange();
  }

  function moveSelectedLayer(direction) {
    const selected = getSelectedInstance();
    if (!selected) return;

    const sorted = getSortedInstancesAsc();
    const currentIndex = sorted.findIndex((instance) => instance.id === selected.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const target = sorted[targetIndex];
    const originalSelectedZ = selected.z;
    const originalTargetZ = target.z;
    const originalSelectedOrder = selected._order;
    const originalTargetOrder = target._order;

    selected.z = originalTargetZ;
    target.z = originalSelectedZ;

    if (originalSelectedZ === originalTargetZ) {
      selected._order = originalTargetOrder;
      target._order = originalSelectedOrder;
    }

    setStatus(direction === 'forward'
      ? tr('editor.status.layerUp', 'Instance moved up.')
      : tr('editor.status.layerDown', 'Instance moved down.'));
    syncUi();
    emitChange();
  }

  function normalizeOrder() {
    const sorted = getSortedInstancesAsc();
    sorted.forEach((instance, index) => {
      instance._order = index + 1;
    });
    setStatus(tr('editor.status.ordered', 'Internal order updated.'));
    syncUi();
    emitChange();
  }

  function downloadJson() {
    const data = JSON.stringify(exportDocument(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'editor-layout.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(tr('editor.status.exported', 'JSON exported as editor-layout.json'));
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportDocument(), null, 2));
      setStatus(tr('editor.status.copied', 'JSON copied to clipboard.'));
    } catch {
      setStatus(tr('editor.status.copyFailed', 'Could not copy the JSON.'));
    }
  }

  function handlePointerDown(event) {
    const mouse = getMousePos(event);
    const hit = findTopmostInstanceAt(mouse);

    if (!hit) {
      state.selectedId = null;
      setStatus(tr('editor.status.noSelection', 'No selection.'));
      syncUi();
      return;
    }

    state.selectedId = hit.instance.id;
    startDrag(hit.instance, hit.mode, hit.handle, mouse);
    setStatus(fmt(tr('editor.status.selected', 'Selected {id}'), { id: hit.instance.id }));
    syncUi();
  }

  function handlePointerMove(event) {
    if (!state.drag) return;
    updateDrag(getMousePos(event));
  }

  function bindEvents() {
    gridInput.addEventListener('input', () => {
      state.grid = Number(gridInput.value) || DEFAULT_GRID;
      draw();
    });

    createBtn.addEventListener('click', createInstance);
    deleteBtn.addEventListener('click', removeSelectedInstance);
    exportBtn.addEventListener('click', downloadJson);
    copyBtn.addEventListener('click', copyJson);
    bringForwardBtn.addEventListener('click', () => moveSelectedLayer('forward'));
    sendBackwardBtn.addEventListener('click', () => moveSelectedLayer('backward'));
    sortAscBtn.addEventListener('click', normalizeOrder);

    labelInput.addEventListener('input', (event) => updateSelectedProperty('label', event.target.value));
    notesInput.addEventListener('input', (event) => updateSelectedProperty('notes', event.target.value));
    xInput.addEventListener('change', (event) => updateSelectedProperty('x', event.target.value));
    yInput.addEventListener('change', (event) => updateSelectedProperty('y', event.target.value));
    widthInput.addEventListener('change', (event) => updateSelectedProperty('width', event.target.value));
    heightInput.addEventListener('change', (event) => updateSelectedProperty('height', event.target.value));
    zInput.addEventListener('change', (event) => updateSelectedProperty('z', event.target.value));
    colorInput.addEventListener('input', (event) => updateSelectedProperty('color', event.target.value));

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('resize', resizeCanvas);

    if (homeBtn && typeof onBack === 'function') {
      homeBtn.addEventListener('click', () => onBack());
    }
  }

  function normalizeIncomingDocument(doc) {
    const base = createBlankDocument();
    const incoming = doc && typeof doc === 'object' ? doc : {};
    const canvasIncoming = incoming.canvas && typeof incoming.canvas === 'object' ? incoming.canvas : {};
    const instancesIncoming = Array.isArray(incoming.instances) ? incoming.instances : [];

    const instances = instancesIncoming.map((instance, index) => {
      const item = instance && typeof instance === 'object' ? instance : {};
      const id = String(item.id || `instance_${String(index + 1).padStart(3, '0')}`);
      return {
        id,
        label: String(item.label || id),
        notes: String(item.notes || ''),
        x: Number.isFinite(Number(item.x)) ? Number(item.x) : DEFAULT_INSTANCE.x,
        y: Number.isFinite(Number(item.y)) ? Number(item.y) : DEFAULT_INSTANCE.y,
        width: Number.isFinite(Number(item.width)) ? Number(item.width) : DEFAULT_INSTANCE.width,
        height: Number.isFinite(Number(item.height)) ? Number(item.height) : DEFAULT_INSTANCE.height,
        z: Number.isFinite(Number(item.z)) ? Math.round(Number(item.z)) : DEFAULT_INSTANCE.z,
        color: String(item.color || DEFAULT_INSTANCE.color),
        _order: index + 1,
      };
    });

    return {
      version: Number.isFinite(Number(incoming.version)) ? Number(incoming.version) : base.version,
      canvas: {
        width: Number.isFinite(Number(canvasIncoming.width)) ? Number(canvasIncoming.width) : base.canvas.width,
        height: Number.isFinite(Number(canvasIncoming.height)) ? Number(canvasIncoming.height) : base.canvas.height,
        aspect: String(canvasIncoming.aspect || base.canvas.aspect),
      },
      instances,
    };
  }

  function loadDocument(doc) {
    state.document = normalizeIncomingDocument(doc);
    state.selectedId = state.document.instances[0]?.id ?? null;
    updateNextIdSeed();
    setStatus(tr('editor.status.projectLoaded', 'Project loaded.'));
    // If the editor was initialized while hidden, recompute now.
    resizeCanvas();
    syncUi();
    emitChange();
  }

  function newDocument() {
    loadDocument(createBlankDocument());
  }

  function init() {
    updateNextIdSeed();
    bindEvents();
    resizeCanvas();
    setStatus(tr('editor.status.ready', 'Editor ready.'));
    syncUi();
  }

  init();

  return {
    loadDocument,
    newDocument,
    exportDocument,
    setLocale,
    resize: () => {
      resizeCanvas();
      syncUi();
    },
  };
}
