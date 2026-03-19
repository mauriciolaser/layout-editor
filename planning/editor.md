# Editor De Instancias

## Resumen
El editor en `index.html` permite construir un layout 2D exportable como un unico JSON.
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
- `x`: posicion horizontal en coordenadas del canvas base.
- `y`: posicion vertical en coordenadas del canvas base.
- `width`: ancho de la instancia.
- `height`: alto de la instancia.
- `z`: orden de apilado; mayor valor significa mas arriba visualmente.
- `color`: color hexadecimal usado para rellenar la instancia en el editor y preservado en el JSON.

## Comportamiento Del Editor
- `Nueva instancia`: crea un rectangulo nuevo con `label`, `z` y `id` autogenerados.
- Seleccion: se puede hacer desde el canvas o desde la lista de capas.
- Movimiento: drag con snap a grilla.
- Resize: handles en las cuatro esquinas con snap a grilla.
- Propiedades: `label`, `x`, `y`, `width`, `height`, `z` y `color` editables desde el sidebar.
- Capas: lista visual ordenada por prioridad; `Subir` y `Bajar` intercambian posicion efectiva.
- Export: descarga `editor-layout.json`.
- Copiar: envia el mismo JSON al portapapeles.

## Notas De Implementacion
- El hit-testing del canvas prioriza la instancia con mayor `z`.
- Si dos instancias tienen el mismo `z`, el editor usa el orden interno como desempate estable.
- El array `instances` se exporta ordenado por `z` ascendente.
- El color se guarda por instancia y no afecta dimensiones ni orden.

## Archivos Relevantes
- `index.html`: shell visual y controles del editor.
- `editor/main.js`: estado, render, interaccion y export JSON.
