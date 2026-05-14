# Plugin-Entwicklung für Offline-Player

Dieses Dokument beschreibt, wie du eigene Plugins für den Offline-Player entwickelst. Es werden sowohl Backend- als auch Frontend-Plugins unterstützt. Die Beispiele basieren auf dem aktuellen Stand (November 2025) des Plugin-Systems.

---

## Übersicht

- Plugins bestehen aus einem Backend (z.B. Go-Binary, Script) und einem Frontend (JavaScript/React-Modul).
- Jedes Plugin liegt in einem eigenen Unterordner unter `workspace/plugins/<pluginname>`.
- Die Plugin-Kommunikation erfolgt über eine API-Bridge (`window.callPluginBackend`).
- Das Frontend wird als ES-Modul gebündelt und dynamisch geladen.

---

## 1. Plugin-Struktur

```
workspace/plugins/
  myplugin/
    backend/
      myplugin.go (oder .py, .sh, ...)
      myplugin (Binary nach Build)
    ui/
      src/
        index.jsx
      package.json
      index.js (Build-Output)
    manifest.json
```

---

## 2. manifest.json

Jedes Plugin benötigt eine `manifest.json`:

```json
{
  "id": "myplugin",
  "version": "1.0.0",
  "name": "Mein Plugin",
  "description": "Beschreibung deines Plugins.",
  "author": "Dein Name",
  "tags": ["Beispiel", "Test"],
  "website": "https://example.com/myplugin",
  "filename": "index.js"
}
```

Optionales Feld `minimal` – aktiviert den persistenten Minimal-Modus (siehe Abschnitt 7):

```json
{
  "minimal": {
    "enabled": true,
    "size": { "width": 380, "height": 110 },
    "defaultPosition": "bottom-right"
  }
}
```

---

## 3. Backend-Plugin (Beispiel: Go)

**Datei:** `workspace/plugins/myplugin/backend/myplugin.go`

```go
package main
import (
  "bufio"
  "encoding/json"
  "fmt"
  "os"
)
type PluginInput struct {
  Action string `json:"action"`
  Data   string `json:"data"`
}
type PluginOutput struct {
  Result string `json:"result"`
  Error  string `json:"error,omitempty"`
}
func main() {
  reader := bufio.NewReader(os.Stdin)
  inputBytes, err := reader.ReadBytes('\n')
  if err != nil {
    json.NewEncoder(os.Stdout).Encode(PluginOutput{Error: err.Error()})
    return
  }
  var input PluginInput
  if err := json.Unmarshal(inputBytes, &input); err != nil {
    json.NewEncoder(os.Stdout).Encode(PluginOutput{Error: err.Error()})
    return
  }
  // Beispiel-Logik
  switch input.Action {
  case "echo":
    json.NewEncoder(os.Stdout).Encode(PluginOutput{Result: input.Data})
  default:
    json.NewEncoder(os.Stdout).Encode(PluginOutput{Error: "Unbekannte Aktion"})
  }
}
```

**Build:**
```sh
cd workspace/plugins/myplugin/backend
go build -o myplugin myplugin.go
```

---

## 4. Frontend-Plugin (React, ES-Modul)

**Datei:** `workspace/plugins/myplugin/ui/src/index.jsx`

```jsx
// Wichtig: React und ReactRouterDOM werden vom Host bereitgestellt!
const React = window.React;
const ReactRouterDOM = window.ReactRouterDOM || {};
const { useEffect, useState } = React;
const { Routes, Route, Link } = ReactRouterDOM;

const callBackend = async (action, data) => {
  if (window.callPluginBackend) {
    return await window.callPluginBackend('myplugin', action, data);
  }
  return { error: 'Backend-API nicht verfügbar' };
};

const Home = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleEcho = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    const res = await callBackend('echo', 'Hallo vom Frontend!');
    if (res.error) setError(res.error);
    else setResult(res.result);
    setLoading(false);
  };
  return (
    <div>
      <h2>Mein Plugin</h2>
      <button onClick={handleEcho} disabled={loading}>Echo testen</button>
      {loading && <span>Lade...</span>}
      {error && <span style={{color:'red'}}>Fehler: {error}</span>}
      {result && <span style={{color:'green'}}>Antwort: {result}</span>}
      <Link to="/myplugin/settings">Einstellungen</Link>
    </div>
  );
};

const Settings = () => <div>Plugin-Einstellungen</div>;

const isRouterReady = Routes && Route && Link;
const MyPlugin = () => {
  if (!isRouterReady) return <div>ReactRouterDOM nicht verfügbar.</div>;
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};

export const pluginRoute = {
  path: "/myplugin/",
  element: React.createElement(MyPlugin)
};

export const pluginMenu = {
  label: 'Mein Plugin',
  to: '/myplugin',
  icon: null, // Optional: SVG-Icon
  plugin: 'myplugin',
  settings: [
    { url: '/myplugin/settings', text: 'Einstellungen' }
  ]
};
```

**package.json (UI):**
```json
{
  "name": "myplugin",
  "version": "1.0.0",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "build": "npx esbuild src/index.jsx --bundle --outfile=index.js --format=esm --platform=browser --external:react --external:react-router-dom"
  },
  "devDependencies": {
    "esbuild": "^0.19.0"
  }
}
```

**Build:**
```sh
cd workspace/plugins/myplugin/ui
npm install
npm run build
```

---

## 5. Backend-Kommunikation

- Das Frontend ruft das Backend über `window.callPluginBackend(plugin, action, data)` auf.
- Die Host-App muss diese Funktion bereitstellen und die Kommunikation mit dem Plugin-Backend übernehmen.
- Beispiel für die Host-Bridge (siehe main.tsx):

```js
window.callPluginBackend = async (plugin, action, data) => {
  // Beispiel: Dummy-Implementierung
  if (plugin === 'myplugin' && action === 'echo') {
    return { result: data };
  }
  // TODO: Echte Backend-Logik anbinden
  return { error: 'Backend-API nicht implementiert' };
};
```

---

## 6. Tipps & Hinweise

- React und ReactRouterDOM werden vom Host bereitgestellt (kein Import im Plugin-Bundle!).
- Die Plugin-UI muss als ES-Modul gebaut werden und `pluginRoute` sowie `pluginMenu` exportieren.
- Die Backend-Logik kann in jeder Sprache umgesetzt werden, solange sie über STDIN/STDOUT kommuniziert.
- Die manifest.json muss im Plugin-Ordner liegen und auf die gebaute index.js zeigen.

---

## 7. Weiterführende Beispiele
- Siehe das Beispiel-Plugin `workspace/plugins/dummyplugin` im Repository.
- Für komplexere Backends: Siehe die Backend-API und die Plugin-Manager-Logik im Hauptprojekt.

---

## 7. Persistenter Minimal-Modus

Plugins, die auch nach einem Routenwechsel weiterlaufen sollen (z.B. ein Musik-Player), können sich für den **persistenten Minimal-Modus** registrieren. Der Host hält das iframe-Element am Leben und zeigt es als kleines schwebendes Dock an, solange der Nutzer auf einer anderen Route ist.

### Schritt 1 – manifest.json

```json
"minimal": {
  "enabled": true,
  "size": { "width": 380, "height": 110 },
  "defaultPosition": "bottom-right"
}
```

### Schritt 2 – Host-Bridge einbinden

Kopiere `frontend/src/api/pluginHostBridge.ts` aus dem Hauptprojekt in deinen Plugin-Quellcode (z.B. `src/lib/hostBridge.ts`). Die Datei hat keine externen Abhängigkeiten und funktioniert in jedem Vite/esbuild-Projekt.

```ts
import { requestMinimalMode, releaseMinimalMode, subscribeMode } from './lib/hostBridge';
```

### Schritt 3 – Modus aktivieren/deaktivieren

```ts
// Aktivieren, sobald dein Plugin "lebt" (z.B. Track geladen, Call gestartet)
requestMinimalMode();

// Deaktivieren, wenn das Plugin nicht mehr benötigt wird
releaseMinimalMode();
```

Typisches Muster in React (z.B. in einem Context-Provider):

```ts
useEffect(() => {
  if (currentTrack) {
    requestMinimalMode();
    return () => releaseMinimalMode();
  }
}, [currentTrack]);
```

### Schritt 4 – UI an den Modus anpassen

```ts
const [mode, setMode] = useState<'full' | 'minimal'>('full');

useEffect(() => subscribeMode(setMode), []); // gibt Unsubscribe zurück

if (mode === 'minimal') return <MinimalBar />;
return <FullUI />;
```

**Wichtig:** Stateful-Komponenten (z.B. `<audio>`, Provider mit Playback-State) immer gemountet lassen – nur das UI wechseln. Andernfalls verlierst du den Zustand beim Moduswechsel.

Vollständiges Beispiel: `plugins/music/` im Repository.

---

## 8. Wichtiger Hinweis: JSX-Transform und Kompatibilität

Damit Plugins im dynamischen Host korrekt funktionieren, darf das gebaute Plugin-Bundle KEINEN Import von "react/jsx-runtime" enthalten. Andernfalls schlägt das dynamische Laden im Browser fehl.

**So stellst du das sicher:**
- Setze in deiner `tsconfig.json` im Plugin-UI:
  ```json
  "jsx": "react"
  ```
  (und NICHT "react-jsx")
- Dadurch wird klassisches `React.createElement` verwendet und kein Import von `react/jsx-runtime` generiert.
- Das Build-Skript für esbuild muss weiterhin `--external:react --external:react-router-dom` (und optional `--external:react/jsx-runtime`) enthalten.

**Hintergrund:**
- Das neue JSX-Transform ("react-jsx") benötigt zur Laufzeit das Modul `react/jsx-runtime`, das im dynamischen Plugin-Host nicht verfügbar ist.
- Mit klassischem JSX-Transform (`jsx: "react"`) funktioniert das dynamische Laden zuverlässig.

---

Viel Erfolg beim Entwickeln eigener Plugins für den Offline-Player!
