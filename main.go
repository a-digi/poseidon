package main

import (
	"embed"
	"fmt"
	"log"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed frontend/dist/*
var assets embed.FS

var icon []byte

var (
	appVersion      = "dev"
	appCommit       = "unknown"
	appBuildDate    = "unknown"
	appUpdateOwner  = "a-digi"
	appUpdateRepo   = "poseidon"
)

func main() {
	var startURL string
	if len(os.Args) > 1 {
		arg := os.Args[1]
		if len(arg) > 19 && arg[:19] == "t-digi-posseidon://" {
			fmt.Println("App wurde mit URL gestartet:", arg)
			startURL = arg
		}
	}

	app := NewApp(appVersion, appCommit, appBuildDate, startURL)

	err := wails.Run(&options.App{
		Title:             "t-digi-posseidon",
		Width:             768,
		Height:            600,
		MinWidth:          768,
		MinHeight:         600,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		BackgroundColour:  &options.RGBA{R: 255, G: 255, B: 255, A: 255},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:              nil,
		Logger:            nil,
		LogLevel:          logger.DEBUG,
		OnStartup:         app.Startup,
		OnDomReady:        app.DomReady,
		OnBeforeClose:     app.BeforeClose,
		OnShutdown:        app.Shutdown,
		WindowStartState:  options.Normal,
		Bind: []interface{}{
			app,
		},

		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
			WebviewUserDataPath: "",
			ZoomFactor: 1.0,
		},

		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: false,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            false,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			About: &mac.AboutInfo{
				Title:   "t-digi-posseidon",
				Message: "",
				Icon:    icon,
			},
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
