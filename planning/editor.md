# Editor De Instancias

## Resumen
La aplicacion tiene una pantalla Home con proyectos guardados en `localStorage`, selector de idioma (`CASTELLANO | ENGLISH`) y un editor 2D exportable como un unico JSON.
Trabaja sobre un canvas fijo de `1920x1080` (`16:9`) y escala solo la vista, no las coordenadas del documento.

## Documento Exportado
Formato base:

```json
{
  "version": 1,
  "canvas": {
    "width": 1920,
    "height": 1080,
    "aspect": "16:9"
  },
  "instances": [
    {
      "id": "instance_001",
      "label": "Hero",
      "notes": "Zona segura para UI. No poner personajes aca.",
      "x": 120,
      "y": 80,
      "width": 420,
      "height": 260,
      "z": 0,
      "color": "#e8bf52"
    }
  ]
}
```

## Campos De Instancia
- `id`: identificador estable autogenerado.
- `label`: nombre editable mostrado en canvas y panel lateral.
- `notes`: longtext para guiar a usuarios (se preserva en el JSON).
- `x`: posicion horizontal en coordenadas del canvas base.
- `y`: posicion vertical en coordenadas del canvas base.
- `width`: ancho de la instancia.
- `height`: alto de la instancia.
- `z`: orden de apilado; mayor valor significa mas arriba visualmente.
- `color`: color hexadecimal usado para rellenar la instancia en el editor y preservado en el JSON.

## Internacionalizacion
- Los textos visibles de la UI viven en `data/ui.json`.
- Idiomas soportados:
  - `es`
  - `en`
- La pagina tiene una navbar superior con el logo y un toggle para cambiar entre castellano e ingles.
- El idioma se persiste en `localStorage` para mantener la preferencia entre sesiones.
- La navbar incluye `Inicio` y `Acerca de`.
- `Acerca de` abre un modal con el credito de `perulainen` y el link al repo.

## Comportamiento Del Editor
- `Nueva instancia`: crea un rectangulo nuevo con `label`, `z` y `id` autogenerados.
- Seleccion: se puede hacer desde el canvas o desde la lista de capas.
- Movimiento: drag con snap a grilla.
- Resize: handles en las cuatro esquinas con snap a grilla.
- Propiedades: `label`, `notes`, `x`, `y`, `width`, `height`, `z` y `color` editables desde el sidebar.
- Capas: lista visual ordenada por prioridad; `Subir` y `Bajar` intercambian posicion efectiva.
- Export: descarga `editor-layout.json`.
- Copiar: envia el mismo JSON al portapapeles.

## Home Y Proyectos (Persistencia)
- La pantalla Home lista proyectos guardados en `localStorage`.
- Acciones:
  - Crear proyecto nuevo.
  - Abrir proyecto.
  - Borrar proyecto.
- Guardado:
  - Se auto-guarda el documento del proyecto al editar (debounce corto).
  - Los proyectos viven solo en el navegador actual.
- `Abrir`, `Borrar` y `Inicio` tienen estilos tipo pill para una apariencia mas limpia y consistente.

## Navegacion
- En el editor existe un menu con boton `Inicio` para volver a Home.
- La parte superior de la app usa una navbar compartida con `logo.png` y el selector de idioma.
- El modal About se cierra con el boton, el fondo o `Esc`.

## Notas De Implementacion
- El hit-testing del canvas prioriza la instancia con mayor `z`.
- Si dos instancias tienen el mismo `z`, el editor usa el orden interno como desempate estable.
- El array `instances` se exporta ordenado por `z` ascendente.
- El color se guarda por instancia y no afecta dimensiones ni orden.
- `data/ui.json` es la fuente de verdad para textos y placeholders traducidos.

## Archivos Relevantes
- `index.html`: shell visual (Home + Editor).
- `styles.css`: estilos (CSS separado del HTML).
- `main.js`: Home, proyectos en `localStorage`, navegacion y analytics.
- `data/ui.json`: catalogo de UI en castellano e ingles.
- `editor/main.js`: editor (estado, render, interaccion, export JSON).
