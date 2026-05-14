package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/pkg/browser"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"t-digi-posseidon/src/config"
	"t-digi-posseidon/src/config/storage"
	"t-digi-posseidon/src/db/orm"
	"t-digi-posseidon/src/db/sqlite"
	"t-digi-posseidon/src/plugins/longrunning"
	"t-digi-posseidon/src/plugins/queue"
	"t-digi-posseidon/src/plugins/server"
	"t-digi-posseidon/src/system"
	"t-digi-posseidon/src/updater"
)

type App struct {
	ctx             context.Context
	userDataDir     string
	StartURL        string
	backendServer   *http.Server
	pluginBasePath  string
	pluginDBManager *orm.PluginDBManager
	sqliteDB        *sql.DB
	queueStop       queue.StopFunc
	longRunning     *longrunning.Registry
	appVersion      string
	appCommit       string
	appBuildDate    string
	systemStore     *system.Store
	updateSvc       *updater.Service
}

func NewApp(version, commit, buildDate string, startURL ...string) *App {
	app := &App{
		appVersion:   version,
		appCommit:    commit,
		appBuildDate: buildDate,
	}
	if len(startURL) > 0 {
		app.StartURL = startURL[0]
	}
	return app
}

var defaultDataDir string

func (a *App) Startup(ctx context.Context) {
	appName := "poseidon"
	if dir, err := storage.CreateAppDataDir(appName); err == nil {
		defaultDataDir = dir
		log.Printf("[DEBUG] defaultDataDir initialisiert: %s", defaultDataDir)
	} else {
		log.Printf("[WARN] Konnte AppDataDir nicht erstellen: %v, nutze TempDir", err)
		defaultDataDir = os.TempDir()
		log.Printf("[DEBUG] defaultDataDir Fallback (TempDir): %s", defaultDataDir)
	}

	allowed := config.ParseAllowedCommands(os.Args[1:])
	isDev := allowed["dev"] == "true" || runtime.Environment(ctx).BuildType == "dev"
	customDataDir := allowed["data-dir"]

	a.ctx = ctx

	a.updateSvc = updater.New(a.appVersion, &updater.GitHubReleaseSource{
		Owner: appUpdateOwner,
		Repo:  appUpdateRepo,
	})

	builder := config.NewAppBuilder()
	userDataDir := builder.BuildUserDataDir(allowed, isDev, defaultDataDir)
	a.userDataDir = userDataDir
	a.pluginBasePath = builder.BuildPluginBasePath(allowed, isDev, userDataDir)

	pluginDirs := []string{a.pluginBasePath}
	for _, dir := range pluginDirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("[ERROR] Konnte Plugin-Verzeichnis nicht erstellen: %s: %v", dir, err)
		} else if isDev {
			log.Printf("[DEV] Plugin-Verzeichnis existiert oder wurde erstellt: %s", dir)
		}
	}

	if customDataDir != "" {
		userDataDir = customDataDir
		if isDev {
			log.Printf("[DEV] [DATA] Verwende benutzerdefiniertes Datenverzeichnis: %s", userDataDir)
		} else {
			log.Printf("[DATA] Verwende benutzerdefiniertes Datenverzeichnis: %s", userDataDir)
		}
	}

	a.userDataDir = userDataDir

	a.systemStore = system.NewStore(a.userDataDir)
	if err := a.systemStore.RecordLaunch(a.appVersion); err != nil {
		log.Printf("system: RecordLaunch: %v", err)
	}

	sqliteDB, err := sqlite.Open(userDataDir, "poseidon.db")
	if err != nil {
		log.Fatalf("[FATAL] Konnte SQLite-Datenbank nicht öffnen: %v", err)
	}
	a.sqliteDB = sqliteDB

	a.pluginDBManager = orm.NewPluginDBManager(a.userDataDir)
	localDevSourceDir := builder.BuildLocalDevSourceDir(allowed, isDev)
	if isDev {
		log.Printf("[DEV] local-dev source dir: %q", localDevSourceDir)
	}
	srv, qStop, lr, err := server.StartOAuthCallbackServer(a.pluginBasePath, a.userDataDir, a.pluginDBManager, isDev, localDevSourceDir, a.OpenDirectoryDialog, a.OpenAnyFileDialog, a.OpenFileDialog)
	if err != nil {
		log.Fatalf("[FATAL] Konnte Backend-Server nicht starten: %v", err)
	}
	a.backendServer = srv
	a.queueStop = qStop
	a.longRunning = lr

	go func() {
		log.Println("[OAUTH] Callback-Server wird auf Port 2014 gestartet ...")
		if err := a.backendServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("[OAUTH] Callback-Server Fehler: %v", err)
		} else {
			log.Println("[OAUTH] Callback-Server läuft auf Port 2014.")
		}
	}()
}

func (a *App) DomReady(ctx context.Context) {
	clearWebViewCache()
}

func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	return false
}

func (a *App) Shutdown(ctx context.Context) {
	log.Println("[INFO] App Shutdown aufgerufen. Die Anwendung wird beendet.")
	if a.longRunning != nil {
		a.longRunning.StopAll(15 * time.Second)
		log.Println("[INFO] Long-running Plugin-Kinder wurden sauber beendet.")
	}
	if a.queueStop != nil {
		a.queueStop(15 * time.Second)
		log.Println("[INFO] Queue-Worker wurden sauber beendet.")
	}
	if a.pluginDBManager != nil {
		if err := a.pluginDBManager.CloseAll(); err != nil {
			log.Printf("[ERROR] Fehler beim Schließen der Plugin-Datenbanken: %v", err)
		} else {
			log.Println("[INFO] Plugin-Datenbanken wurden sauber geschlossen.")
		}
	}
	if a.sqliteDB != nil {
		if err := a.sqliteDB.Close(); err != nil {
			log.Printf("[ERROR] Fehler beim Schließen der SQLite-Datenbank: %v", err)
		} else {
			log.Println("[INFO] SQLite-Datenbank wurde sauber geschlossen.")
		}
	}
	if a.backendServer != nil {
		if err := a.backendServer.Shutdown(ctx); err != nil {
			log.Printf("[ERROR] Fehler beim Shutdown des Backend-Servers: %v", err)
		} else {
			log.Println("[INFO] Backend-Server wurde sauber beendet.")
		}
	}
}

func (a *App) OpenFileDialog() string {
	result, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Datei auswählen",
		Filters: []runtime.FileFilter{
			{DisplayName: "Audio", Pattern: "*.mp3;*.wav;*.ogg;*.flac;*.aac;*.m4a"},
		},
	})
	if err != nil {
		return ""
	}
	return result
}

func (a *App) OpenAnyFileDialog() string {
	result, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Datei auswählen",
	})
	if err != nil {
		return ""
	}
	return result
}

func (a *App) OpenDirectoryDialog() string {
	result, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Zielordner wählen",
	})
	if err != nil {
		return ""
	}
	return result
}

func (a *App) GetSystemInfo() (system.SystemInfo, error) {
	d, err := a.systemStore.Read()
	if err != nil {
		return system.SystemInfo{}, err
	}
	return system.BuildInfo(
		system.BuildVars{Version: a.appVersion, Commit: a.appCommit, BuildDate: a.appBuildDate},
		a.userDataDir,
		d,
	), nil
}

func (a *App) OpenDataDir() error {
	runtime.BrowserOpenURL(a.ctx, "file://"+a.userDataDir)
	return nil
}

func (a *App) GetStartURL() string {
	return a.StartURL
}

func (a *App) CheckForUpdate() updater.UpdateState {
	return a.updateSvc.Check(context.Background())
}

func (a *App) GetLastUpdateCheck() updater.UpdateState {
	return a.updateSvc.Last()
}

func (a *App) OpenUpdateDownload() error {
	state := a.updateSvc.Last()
	if state.Asset == nil || state.Asset.URL == "" {
		return fmt.Errorf("no update asset available for this platform")
	}
	return browser.OpenURL(state.Asset.URL)
}
