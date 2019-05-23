const crypto = require('crypto')
const contextFuncs = require('./contextFuncs')
const remote = require('electron').remote

let display = remote.screen.getPrimaryDisplay()

module.exports = {
  sha1: (string) => {
    return crypto.createHash('sha1').update(string, 'binary').digest('hex')
  },

  addContextMenu: function(element, subElement, options, funcs) {
    element.on('contextmenu', subElement, (e) => {
      e.preventDefault()

      $('#contextmenu > ul').html('')
      for(var i = 0; i < options.length; i++){
        this.addMenuOption(options[i])
        this.addClickHandler($(e.currentTarget), '#' + options[i].attr('id'), funcs[i])
      }

      const origin = {
        left: e.pageX,
        top: e.pageY
      }
  
      this.setPosition($('#contextmenu'), origin)
    })
  },

  addClickHandler: function(clickedElement, menuOptionId, func) {
    $(menuOptionId).on('click', () => {
      func(clickedElement)
      this.toggleMenu($('#contextmenu'), 'hide')
    })
  },

  addMenuOption: (option) => {
    $('#contextmenu > ul').append(option)
  },

  toggleMenu: (menu, command) => {
    if(command == 'show')
      menu.css('display', 'block')
    else
      menu.css('display', 'none')
  
    contextMenuVisible = !contextMenuVisible
  },

  setPosition: function(menu, pos) {
    var windowWidth = remote.getCurrentWindow().getBounds().width
    var windowHeight = remote.getCurrentWindow().getBounds().height

    if((pos.top + menu.height()) > windowHeight){
      pos.top = pos.top - menu.height()
    }

    if((pos.left + menu.width()) > windowWidth){
      pos.left = pos.left - menu.width()
    }

    menu.css({'left': pos.left + 'px', 'top': pos.top + 'px'})
    this.toggleMenu(menu, 'show')
  },

  createContextMenus: function() {
    var messageContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-copyMsgBtn').text('Copiar'),
      $('<li>').addClass('menu-separator'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-editMsgBtn').text('Editar mensaje'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-removeMsgBtn').text('Eliminar mensaje')
    ]
  
    var channelContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-editChannelBtn').text('Editar canal'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-removeChannelBtn').text('Eliminar canal')
    ]

    var mainInputContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-copyMainInputBtn').text('Copiar'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-pasteMainInputBtn').text('Pegar'),
      $('<li>').addClass('menu-separator'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-clearMainInputBtn').text('Limpiar'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-selectAllMainInputBtn').text('Seleccionar todo'),
    ]
  
    var messageContextMenuFuncs = [contextFuncs.copyMessage, null, contextFuncs.editMessage, contextFuncs.removeMessage]
    var channelContextMenuFuncs = [contextFuncs.editChannel, contextFuncs.removeChannel]
    var mainInputContextMenuFuncs = [contextFuncs.copyMainInput, contextFuncs.pasteMainInput, null, contextFuncs.clearMainInput, contextFuncs.selectAllMainInput]
  
    this.addContextMenu($('#chat-messages'), '.message-line', messageContextMenuOptions, messageContextMenuFuncs)
    this.addContextMenu($('#chnl-panel'), 'li', channelContextMenuOptions, channelContextMenuFuncs)
    this.addContextMenu($('#chatBottom'), '#mainInput', mainInputContextMenuOptions, mainInputContextMenuFuncs)
  },

  loadChannelMessages: function() {
    $('#chat-messages').html('')
    vars.socket.emit('getChannelMessages', this.getActiveChannel())
  },

  scroll: () => {
    $('#chat-messages').scrollTop($('#chat-messages').prop('scrollHeight') - $('#chat-messages').prop('clientHeight'))
  },

  getActiveChannel: () => {
    return $('#chnl-panel > li.active-channel').text()
  },

  selectFirstChannel: function() {
    if($('#chnl-panel > li').length > 0){
      if($('#chnl-panel > li:first').text() != this.getActiveChannel()){
        $('#chnl-panel > li:first').click()
        $('#mainInput').prop('disabled', false)
        $('#chnl-hr').attr('data-content', $('#chnl-panel > li:first').text())
      }
    }else{
      $('#mainInput').prop('disabled', true)
      $('#chnl-hr').attr('data-content', "")
    }
  },

  createNotification: (title, content, color, icon) => {
    if(vars.activeNotification != null){
      try{
        vars.activeNotification.close()
      }catch(err){}
    }
    var window = remote.getCurrentWindow()
    win = new remote.BrowserWindow({
      width: (display.bounds.width * 0.25),
      height: 100,
      x: (display.bounds.width - (display.bounds.width * 0.25)) - 10,
      y: (display.bounds.height - 100) - 50,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      titleBarStyle: 'hidden',
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true
      }
    })

    win.loadFile('src/template/notif.html')

    vars.activeNotification = win
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('notif', {title: title, content: content, color: color, icon: icon})
      window.focus()
    })

    win.show()
  },

  addAlert: function(content, color){
    var alert = $('<div>').text(content).addClass('alert ' + color);
    $('#alertas').append(alert);
    setTimeout(function(){
      alert.fadeOut(1200, function(){
        $(this).remove();
      });
    }, 2000);
  }
};

