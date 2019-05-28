const { app, BrowserWindow, Tray, globalShortcut, Menu } = require('electron')
const path = require('path')

let win
let tray

function createWindow () { 
  win = new BrowserWindow({
    width: 950,
    height: 600,
    'minHeight': 450,
    'minWidth': 600,
    frame: false,
    title: 'pChat',
    resizable: true,
    backgroundColor: '#343A40',
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'images/icns/icon.ico'),
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.setMenu(null)
  win.loadFile(path.join(__dirname, 'src/template/index.html'))
  win.webContents.openDevTools()
  tray = new Tray('images/icns/icon.png')
  tray.setToolTip('pChat');

  var contextMenu = Menu.buildFromTemplate([
    {
      label: 'Restaurar', click: () => {
        win.show()
      }
    },
    {
      type: 'separator' 
    },
    {
      label: 'Cerrar', click: () => {
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

  globalShortcut.register('Alt+Q', () =>{
    if(win.isVisible()){
      win.hide()
    }else{
      win.show()
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