import { createBlankDocument, createEditor } from './editor/main.js';

const STORAGE_KEY = 'perulainen.layoutEditor.projects.v1';
const LANG_KEY = 'perulainen.layoutEditor.lang.v1';

const els = {
  homeView: document.getElementById('homeView'),
  editorView: document.getElementById('editorView'),
  newProjectName: document.getElementById('newProjectName'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  projectList: document.getElementById('projectList'),
  projectTitle: document.getElementById('projectTitle'),
  languageToggle: document.getElementById('languageToggle'),
};

let uiCatalog = null;
let currentLang = localStorage.getItem(LANG_KEY) || 'es';
let projects = loadProjects();
let currentProjectId = null;
let editor = null;

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjects(nextProjects) {
  projects = nextProjects;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function loadUiCatalog() {
  return fetch('./data/ui.json', { cache: 'no-store' }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to load UI catalog: ${response.status}`);
    }
    return response.json();
  });
}

function resolvePath(object, path) {
  return path.split('.').reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), object);
}

function currentLocale() {
  return uiCatalog?.[currentLang] || uiCatalog?.es || null;
}

function t(path) {
  const locale = currentLocale();
  const value = locale ? resolvePath(locale, path) : undefined;
  return typeof value === 'string' ? value : '';
}

function format(template, values = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? ''));
}

function setMeta(name, content) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (el) el.setAttribute('content', content);
}

function setPropertyMeta(property, content) {
  const el = document.querySelector(`meta[property="${property}"]`);
  if (el) el.setAttribute('content', content);
}

function applyLocaleToDom() {
  const locale = currentLocale();
  if (!locale) return;

  document.documentElement.lang = currentLang;
  document.title = t('meta.title');
  setMeta('description', t('meta.description'));
  setMeta('keywords', t('meta.keywords'));
  setMeta('theme-color', '#0b0d12');
  setPropertyMeta('og:title', t('meta.title'));
  setPropertyMeta('og:description', t('meta.description'));
  setPropertyMeta('og:site_name', t('meta.siteName'));
  setMeta('twitter:title', t('meta.title'));
  setMeta('twitter:description', t('meta.description'));

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = resolvePath(locale, node.dataset.i18n);
    if (typeof value === 'string') {
      node.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const value = resolvePath(locale, node.dataset.i18nPlaceholder);
    if (typeof value === 'string') {
      node.setAttribute('placeholder', value);
    }
  });

  if (els.languageToggle) {
    els.languageToggle.setAttribute('aria-pressed', currentLang === 'en' ? 'true' : 'false');
  }

  if (editor) {
    editor.setLocale(locale.editor);
  }

  renderProjectList();

  if (currentProjectId) {
    const project = getProjectById(currentProjectId);
    if (project) {
      els.projectTitle.textContent = project.name;
    }
  } else {
    els.projectTitle.textContent = t('editor.projectBadge');
  }
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString(currentLang === 'en' ? 'en-US' : 'es-ES');
  } catch {
    return '';
  }
}

function makeProjectId() {
  const rand = Math.random().toString(16).slice(2, 10);
  return `proj_${Date.now()}_${rand}`;
}

function getProjectById(id) {
  return projects.find((project) => project.id === id) || null;
}

function updateProject(updated) {
  saveProjects(projects.map((project) => (project.id === updated.id ? updated : project)));
}

function createProject(name) {
  const project = {
    id: makeProjectId(),
    name: String(name || '').trim() || t('home.defaultProjectName'),
    updatedAt: Date.now(),
    document: createBlankDocument(),
  };

  saveProjects([project, ...projects]);
  return project;
}

function deleteProject(id) {
  saveProjects(projects.filter((project) => project.id !== id));
}

function renderProjectList() {
  els.projectList.innerHTML = '';

  if (!projects.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = t('home.emptyProjects');
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
    meta.textContent = `${t('home.updatedPrefix')} ${formatDate(project.updatedAt)}`;

    const actions = document.createElement('div');
    actions.className = 'project-actions';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'primary pill-btn';
    openBtn.textContent = t('home.openButton');
    openBtn.addEventListener('click', () => openProject(project.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'danger pill-btn';
    delBtn.textContent = t('home.deleteButton');
    delBtn.addEventListener('click', () => {
      const ok = window.confirm(format(t('home.confirmDeleteProject'), { name: project.name }));
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

function showHome() {
  currentProjectId = null;
  els.editorView.classList.add('is-hidden');
  els.homeView.classList.remove('is-hidden');
  renderProjectList();
}

function showEditor(project) {
  els.projectTitle.textContent = project?.name || t('editor.projectBadge');
  els.homeView.classList.add('is-hidden');
  els.editorView.classList.remove('is-hidden');
}

function openProject(id) {
  const project = getProjectById(id);
  if (!project) return;
  currentProjectId = id;
  showEditor(project);
  editor.loadDocument(project.document);
}

function bindEvents() {
  els.newProjectBtn.addEventListener('click', () => {
    const name = els.newProjectName.value;
    els.newProjectName.value = '';
    const project = createProject(name);
    openProject(project.id);
  });

  els.newProjectName.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    els.newProjectBtn.click();
  });

  els.languageToggle.addEventListener('click', () => {
    currentLang = currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem(LANG_KEY, currentLang);
    applyLocaleToDom();
  });
}

async function init() {
  uiCatalog = await loadUiCatalog();
  currentLang = uiCatalog[currentLang] ? currentLang : 'es';

  editor = createEditor({
    onBack: showHome,
    onDocumentChange: (doc) => scheduleSave(currentProjectId, doc),
    ui: uiCatalog[currentLang].editor,
  });

  bindEvents();
  applyLocaleToDom();
  showHome();
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = '<pre style="padding:20px;color:#fff;background:#0b0d12">Failed to load application UI.</pre>';
});
