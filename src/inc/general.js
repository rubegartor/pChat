const crypto = require('crypto')
const fs = require('fs')
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

    var imageContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-removeImageBtn').text('Eliminar imagen'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-saveImageBtn').text('Guardar')
    ]
  
    var channelContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-editChannelBtn').text('Editar canal'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-removeChannelBtn').text('Eliminar canal'),
      $('<li>').addClass('menu-separator'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-infoChannelBtn').text('Información'),
    ]

    var mainInputContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-copyMainInputBtn').text('Copiar'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-pasteMainInputBtn').text('Pegar'),
      $('<li>').addClass('menu-separator'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-clearMainInputBtn').text('Limpiar'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-selectAllMainInputBtn').text('Seleccionar todo'),
    ]
  
    var messageContextMenuFuncs = [contextFuncs.copyMessage, null, contextFuncs.editMessage, contextFuncs.removeMessage]
    var imageContextMenuFuncs = [contextFuncs.removeMessage, contextFuncs.saveImage]
    var channelContextMenuFuncs = [contextFuncs.editChannel, contextFuncs.removeChannel, null, contextFuncs.infoChannel]
    var mainInputContextMenuFuncs = [contextFuncs.copyMainInput, contextFuncs.pasteMainInput, null, contextFuncs.clearMainInput, contextFuncs.selectAllMainInput]
  
    this.addContextMenu($('#chat-messages'), '.message-line', messageContextMenuOptions, messageContextMenuFuncs)
    this.addContextMenu($('#chat-messages'), '.imageMsg', imageContextMenuOptions, imageContextMenuFuncs)
    this.addContextMenu($('#chnl-panel'), 'li', channelContextMenuOptions, channelContextMenuFuncs)
    this.addContextMenu($('#chatBottom'), '#mainInput', mainInputContextMenuOptions, mainInputContextMenuFuncs)
  },

  loadActiveChannelMessages: function() {
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
      width: (display.bounds.width * 0.20),
      height: 100,
      x: (display.bounds.width - (display.bounds.width * 0.20)) - 10,
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

  addAlert: (content, color) => {
    var alert = $('<div>').text(content).addClass('alert ' + color)
    $('#alertas').append(alert)
    setTimeout(() => {
      alert.fadeOut(1200, function(){
        $(this).remove()
      })
    }, 2000)
  },

  loadUserConfig: () => {
    if(vars.me.status.notif == true){
      $('#notifBtn').attr('src', 'file:///images/notif2_20.png')
    }else{
      $('#notifBtn').attr('src', 'file:///images/notif1_20.png')
    }
  },

  base64Encode: (file) => {
    var body = fs.readFileSync(file)
    return body.toString('base64')
  },

  splitAutocomplete: (val) => {
    return val.split(/@\s*/)
  },

  extractLastAutocomplete: function(term) {
    return '@' + this.splitAutocomplete(term).pop()
  },

  setCaretPosition: (elem, caretPos) => {
    if(elem != null) {
      if(elem.createTextRange) {
        var range = elem.createTextRange()
        range.move('character', caretPos)
        range.select()
      }else{
        if(elem.selectionStart) {
          elem.focus()
          elem.setSelectionRange(caretPos, caretPos)
        }else{
          elem.focus()
        }
      }
    }
  },

  imageUrlToB64: (imgUrl, callback) => {
    var img = new Image()
    img.onload = () => {
      var canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      var ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      var dataURL = canvas.toDataURL('image/png'),
        dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, '')

      callback(dataURL)
    }

    img.setAttribute('crossOrigin', 'anonymous')
    img.src = imgUrl
  },

  showFullImage: function(img){
    $('#chnl-hr').attr('data-content', '')
    var new_img = $('<img>').attr('src', img).addClass('main-image')
    $('.image-bg').on('click', function(){
      $(this).hide()
      $('#chnl-hr').attr('data-content', funcs.getActiveChannel())
    })
    $('#main-image > div').html('')
    $('#main-image > div').append(new_img)
    $('#main-image').show()
  }
}

