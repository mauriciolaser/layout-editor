import { createBlankDocument, createEditor } from './editor/main.js';

const STORAGE_KEY = 'perulainen.layoutEditor.projects.v1';

function initAnalytics() {
  const GA_ID = '__GA_ID__';
  if (!GA_ID || GA_ID === '__GA_ID__') return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', GA_ID);
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

function makeProjectId() {
  const rand = Math.random().toString(16).slice(2, 10);
  return `proj_${Date.now()}_${rand}`;
}

const els = {
  homeView: document.getElementById('homeView'),
  editorView: document.getElementById('editorView'),
  newProjectName: document.getElementById('newProjectName'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  projectList: document.getElementById('projectList'),
  projectTitle: document.getElementById('projectTitle'),
};

let projects = loadProjects();
let currentProjectId = null;

function showHome() {
  currentProjectId = null;
  els.editorView.classList.add('is-hidden');
  els.homeView.classList.remove('is-hidden');
  renderProjectList();
}

function showEditor(project) {
  els.projectTitle.textContent = project?.name || 'Proyecto';
  els.homeView.classList.add('is-hidden');
  els.editorView.classList.remove('is-hidden');
}

function getProjectById(id) {
  return projects.find((p) => p.id === id) || null;
}

function updateProject(updated) {
  projects = projects.map((p) => (p.id === updated.id ? updated : p));
  saveProjects(projects);
}

function createProject(name) {
  const id = makeProjectId();
  const project = {
    id,
    name: String(name || '').trim() || 'Nuevo proyecto',
    updatedAt: Date.now(),
    document: createBlankDocument(),
  };
  projects = [project, ...projects];
  saveProjects(projects);
  return project;
}

function deleteProject(id) {
  projects = projects.filter((p) => p.id !== id);
  saveProjects(projects);
}

function renderProjectList() {
  els.projectList.innerHTML = '';

  if (!projects.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Todavia no hay proyectos. Crea uno para empezar.';
    els.projectList.appendChild(empty);
    return;
  }

  projects.forEach((project) => {
    const row = document.createElement('div');
    row.className = 'project-row';

    const main = document.createElement('div');
    main.className = 'project-main';

    const name = document.createElement('div');
    name.className = 'project-name';
    name.textContent = project.name;

    const meta = document.createElement('div');
    meta.className = 'project-meta';
    meta.textContent = `Actualizado: ${formatDate(project.updatedAt)}`;

    const actions = document.createElement('div');
    actions.className = 'project-actions';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'primary';
    openBtn.textContent = 'Abrir';
    openBtn.addEventListener('click', () => openProject(project.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'danger';
    delBtn.textContent = 'Borrar';
    delBtn.addEventListener('click', () => {
      const ok = window.confirm(`Borrar proyecto "${project.name}"?`);
      if (!ok) return;
      deleteProject(project.id);
      renderProjectList();
    });

    main.appendChild(name);
    main.appendChild(meta);
    actions.appendChild(openBtn);
    actions.appendChild(delBtn);
    row.appendChild(main);
    row.appendChild(actions);
    els.projectList.appendChild(row);
  });
}

let saveTimer = null;
function scheduleSave(projectId, doc) {
  if (!projectId) return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const project = getProjectById(projectId);
    if (!project) return;
    updateProject({ ...project, document: doc, updatedAt: Date.now() });
    saveTimer = null;
  }, 250);
}

const editor = createEditor({
  onBack: showHome,
  onDocumentChange: (doc) => scheduleSave(currentProjectId, doc),
});

function openProject(id) {
  const project = getProjectById(id);
  if (!project) return;
  currentProjectId = id;
  showEditor(project);
  editor.loadDocument(project.document);
}

function bindHome() {
  els.newProjectBtn.addEventListener('click', () => {
    const name = els.newProjectName.value;
    els.newProjectName.value = '';
    const project = createProject(name);
    openProject(project.id);
  });

  els.newProjectName.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    els.newProjectBtn.click();
  });
}

function init() {
  initAnalytics();
  bindHome();
  renderProjectList();
  showHome();
}

init();
