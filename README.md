# Layout Editor (Static)

Editor de instancias 2D (canvas `1920x1080`) exportable como JSON.

## Estructura

- `index.html`: UI del editor.
- `editor/main.js`: logica del editor (estado, render, interaccion, export).
- `planning/`: notas internas (no se deploya).

## Desarrollo local

Este proyecto usa ES Modules, asi que conviene servirlo por HTTP (no abrirlo con `file://`).

Ejemplo rapido con Python:

```bash
python -m http.server 5173
```

Luego abre:

`http://localhost:5173/`

## Deploy por FTP (GitHub Actions)

Hay un workflow manual en GitHub Actions: `.github/workflows/deploy.yml`.

Sube solo:

- `index.html`
- `editor/**`

No borra archivos remotos (`dangerous-clean-slate: false`).

### Secrets requeridos

Configura estos secrets en el repo de GitHub (Settings -> Secrets and variables -> Actions):

- `FTP_HOST`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_DESTINATION` (debe terminar con `/`)
- `GA_ID` (opcional, formato `G-XXXXXX` para GA4)

### Comando de deploy (1 comando)

Desde PowerShell en la raiz del repo (requiere GitHub CLI `gh`):

```powershell
.\scripts\deploy.ps1
```

Opcionalmente, para otra rama:

```powershell
.\scripts\deploy.ps1 -branch main
```
