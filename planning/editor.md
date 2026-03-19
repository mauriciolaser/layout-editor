# Layout Editor

## Resumen
Proyecto web estatico para crear y gestionar proyectos de layouts 2D sobre un canvas fijo de `1920x1080`.

El producto hoy tiene dos vistas principales:

- `Home`: lista de proyectos guardados localmente, creacion de proyectos, acceso a About y cambio de idioma.
- `Editor`: canvas interactivo, panel de propiedades, capas, import/export JSON y copiado al portapapeles.

No hay backend, base de datos ni autenticacion. Toda la persistencia de proyectos y preferencia de idioma vive en `localStorage`.

## Scope Actual
- Crear proyectos locales desde Home.
- Abrir y borrar proyectos existentes.
- Editar un documento 2D con instancias rectangulares.
- Mover y redimensionar instancias con snap a grilla.
- Editar propiedades desde sidebar.
- Reordenar capas mediante `z` y controles de subida/bajada.
- Importar un JSON exportado previamente para reemplazar el layout del proyecto abierto.
- Exportar el documento completo como JSON.
- Copiar el JSON al portapapeles.
- Cambiar idioma entre `es` y `en`.
- Mostrar modal About con credito y enlace al repo.
- Inyectar Google Analytics GA4 durante deploy si existe el secret `GA_ID`.

## Fuera De Scope
- Multiusuario o colaboracion en tiempo real.
- Sincronizacion remota de proyectos.
- Assets subidos por usuario.
- Rotacion, escalado libre o tipos de instancia distintos de rectangulos.
- Sistema de cuentas, permisos o historial de versiones.
- Build step, framework SPA o pipeline de empaquetado.

## Arquitectura
El proyecto esta montado con HTML, CSS y JavaScript vanilla usando ES Modules.

- [`index.html`](C:/Web%20Development/Development/game-editor/index.html): shell completo de la aplicacion, vistas Home y Editor, modal About y snippet de GA4 con placeholder.
- [`main.js`](C:/Web%20Development/Development/game-editor/main.js): bootstrap de la app, gestion de proyectos, persistencia en `localStorage`, i18n, navegacion Home/Editor y modal About.
- [`editor/main.js`](C:/Web%20Development/Development/game-editor/editor/main.js): estado del editor, render del canvas, seleccion, drag, resize, orden de capas, import y export/copy del documento.
- [`data/ui.json`](C:/Web%20Development/Development/game-editor/data/ui.json): catalogo de textos para `es` y `en`.
- [`styles.css`](C:/Web%20Development/Development/game-editor/styles.css): estilos globales de Home, Editor, modal y componentes compartidos.
- [`scripts/deploy.ps1`](C:/Web%20Development/Development/game-editor/scripts/deploy.ps1): helper local para disparar el workflow manual de GitHub Actions.
- [`.github/workflows/deploy.yml`](C:/Web%20Development/Development/game-editor/.github/workflows/deploy.yml): deploy via FTP, con staging e inyeccion opcional de `GA_ID`.

## Modelo De Datos
El documento exportado mantiene este formato base:

```json
{
  "version": 1,
  "canvas": {
    "width": 1920,
    "height": 1080,
    "aspect": "16:9"
  },
  "instances": []
}
```

Cada instancia usa estos campos:

- `id`: identificador estable autogenerado con formato `instance_###`.
- `label`: nombre editable visible en canvas y sidebar.
- `notes`: texto libre preservado en el JSON.
- `x`: posicion horizontal en coordenadas del canvas base.
- `y`: posicion vertical en coordenadas del canvas base.
- `width`: ancho en coordenadas del canvas base.
- `height`: alto en coordenadas del canvas base.
- `z`: prioridad visual.
- `color`: color hexadecimal del rectangulo.

Internamente el editor usa `_order` para desempates visuales y orden estable, pero ese detalle no forma parte del contrato exportado.

## Home Y Persistencia
- Los proyectos se guardan en `localStorage` con la key `perulainen.layoutEditor.projects.v1`.
- El idioma activo se guarda en `perulainen.layoutEditor.lang.v1`.
- Crear proyecto genera un `id` tipo `proj_<timestamp>_<rand>`.
- Cada proyecto guarda:
  - `id`
  - `name`
  - `updatedAt`
  - `document`
- El guardado del documento es automatico y con debounce corto.
- Los proyectos viven solo en el navegador actual.

## Editor
### Interaccion
- Seleccion por click sobre canvas o desde la lista de capas.
- Drag para mover instancias con snap a grilla.
- Resize mediante handles en las cuatro esquinas.
- Hit-testing prioriza mayor `z` y luego orden interno.
- El canvas visible se escala para entrar en pantalla, pero las coordenadas del documento siguen siendo `1920x1080`.

### Controles
- Grilla editable (`2` a `200`).
- Crear instancia.
- Eliminar instancia seleccionada.
- Importar JSON desde archivo local para reemplazar el layout del proyecto abierto.
- Exportar JSON a archivo.
- Copiar JSON al portapapeles.
- Volver a Home desde el boton del editor.

### Importacion JSON
- La importacion espera el mismo contrato exportado por el editor: objeto raiz con `version`, `canvas` e `instances`.
- El usuario selecciona un archivo `.json` local y confirma antes de reemplazar el documento actual.
- Si el JSON es valido, el documento abierto se normaliza y se guarda en el proyecto actual.
- Si el archivo no tiene el formato esperado o el parseo falla, la UI muestra un estado de error y no reemplaza nada.

### Sidebar
- Resumen de seleccion actual.
- Edicion de `label`, `x`, `y`, `width`, `height`, `z`, `color` y `notes`.
- Acciones `Subir` y `Bajar` para ajustar la capa seleccionada.
- Lista de capas con accion para ordenar por `z` ascendente.
- Texto de ayuda con atajos y descripcion del JSON.

## Internacionalizacion
- La UI se resuelve desde `data/ui.json`.
- Idiomas soportados actualmente:
  - `es`
  - `en`
- `main.js` aplica textos, placeholders y metadatos SEO/social segun idioma.
- El toggle superior cambia idioma sin recargar la app.

## Navegacion Y UI General
- Navbar superior compartida con logo, `Inicio`, `Acerca de` y toggle de idioma.
- Home y Editor conviven en el mismo HTML y se alternan con clases CSS.
- El modal About se puede cerrar por boton, backdrop o tecla `Escape`.

## Analytics Y Deploy
- `index.html` contiene un placeholder `__GA_ID__` para GA4.
- El snippet solo se activa si el valor final tiene formato valido `G-...`.
- El workflow de deploy copia a `deploy_staging/`:
  - `index.html`
  - `main.js`
  - `styles.css`
  - `editor/`
  - `data/`
  - assets estaticos
- Si existe el secret `GA_ID`, el workflow reemplaza `__GA_ID__` en `deploy_staging/index.html`.
- El workflow verifica en log que la inyeccion se haya realizado antes de subir por FTP.

## Desarrollo Local
- Servir por HTTP; no abrir con `file://`.
- Entrada principal: `index.html`.
- JS principal: `main.js`.
- No hay proceso de build.

## Notas De Mantenimiento
- Si cambia el contrato del JSON, actualizar este documento y el README.
- Si se agregan nuevos textos visibles, deben entrar en `data/ui.json`.
- Si cambia el scope del deploy, revisar que README, workflow y este documento sigan alineados.
