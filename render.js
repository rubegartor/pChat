const { app, BrowserWindow, Tray, globalShortcut, Menu, dialog } = require('electron')
const Badge = require('electron-windows-badge')
const fs = require('fs')
const path = require('path')

let win
let tray
let config

function dumpConfig(){
  fs.writeFile('./includes/settings.json', JSON.stringify(config), function (err) {})
}

function createWindow () {
  var iconPath
  var trayKey

  fs.readFile('./includes/settings.json', 'utf8', function(err, contents) {
    try{
      config = JSON.parse(contents)

      if(config.general.iconPath != ''){
        iconPath = config.general.iconPath 
      }else{
        iconPath = './includes/icns/icon.png'
      }
  
      if(config.general.trayKey != ''){
        trayKey = config.general.trayKey
      }else{
        trayKey = 'Alt+Q'
      }
    }catch(err){
      dialog.showErrorBox('Error con el archivo de configuración', 'La estructura del archivo settings.json no es correcta')
      app.isQuiting = true
      app.quit()
    }
    
    try{
      win = new BrowserWindow({
        width: 950,
        height: 600,
        'minHeight': 450,
        'minWidth': 550,
        frame: false,
        backgroundColor: '#212529',
        titleBarStyle: 'hidden',
        icon: iconPath,
        webPreferences: {
          nodeIntegration: true
        }
      })
  
      win.setMenu(null)
      win.setResizable(true)
      win.loadFile(path.join(__dirname, 'src/index.html'))
      //win.webContents.openDevTools()
      tray = new Tray(iconPath)
  
      var contextMenu = Menu.buildFromTemplate([
        {
          label: 'Restaurar', click: function () {
            win.show()
          }
        },
        {
          label: 'Configuración', click: function (){
            win.webContents.send('openConfig')
          }
        },
        {
          type: 'separator' 
        },
        {
          label: 'Cerrar', click: function () {
            app.isQuiting = true
            app.quit()
          }
        }
      ])
  
      tray.setContextMenu(contextMenu)
  
      win.on('show', () => {
        tray.setHighlightMode('always')
      })
  
      win.on('hide', () => {
        tray.setHighlightMode('never')
      })
  
      globalShortcut.register(trayKey, () =>{
        if(win.isVisible()){
          win.hide()
        }else{
          win.show()
          win.webContents.send('focusSender')
        }
      })
  
      new Badge(win, {})
    }catch(err){
      config.general.iconPath = './includes/icns/icon.png'
      config.general.trayKey = 'Alt+Q'
      dumpConfig()
      dialog.showErrorBox('Error creando la ventana', 'No se ha podido crear la ventana con tu configuración, se han restaurado los valores por defecto, \
reinicia la aplicación para comprobar si el error se ha solucionado.')
      app.isQuiting = true
      app.quit()
    }
  })
}

app.on('ready', () => {
  createWindow()
})

app.on('window-all-closed', () => {
  app.isQuiting = true
  tray.destroy()
  globalShortcut.unregisterAll()
  app.quit()
})
