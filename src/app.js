const $ = jQuery = require('jquery')
const jimp = require('jimp')
require('jquery-ui-dist/jquery-ui')
const electron = require('electron')
const remote = electron.remote
const vars = require('../inc/vars')
const funcs = require('../inc/general')
const Message = require('../inc/message')
const Channel = require('../inc/channel')
const User = require('../inc/user')

let contextMenuVisible = false
let absentTimeout = null

$(document).ready(function(){
  funcs.createContextMenus()

  $('#close-btn').on('click', () => {
    if(vars.activeNotification != null){
      try{
        vars.activeNotification.close() //Si la notificación esta abierta se cierra
      }catch(err){}
    }
    var window = remote.getCurrentWindow()
    window.close()
  })

  $('#min-btn').on('click', () => {
    var window = remote.getCurrentWindow()
    window.minimize()
  })

  $('#max-btn').on('click', () => {
    var window = remote.getCurrentWindow()
    if(!window.isMaximized())
      window.maximize()
    else
      window.unmaximize()
  })

  $('#chnl-panel').on('click', 'li', function(){
    if($(this).children('input').length == 0){
      if($(this).text() != funcs.getActiveChannel() && $('#configPanel').css('display') != 'block'){
        $('#chnl-panel > li').removeClass('active-channel')
        $('#mainInput').prop('disabled', false)
        $(this).addClass('active-channel')
        $('#chnl-hr').attr('data-content', $(this).text())
        new Channel($(this).text()).join()
        funcs.loadActiveChannelMessages()
      }
    }
  })

  $('#toggleUsersViewBtn').on('click', () => {
    if($('#usrs-panel').css('display') == 'none'){
      $('#usrs-panel').slideDown(250, () => {
        $('#toggleUsersViewBtn').attr('src', 'file:///images/chevron_up_20.png')
      })
    }else{
      $('#usrs-panel').slideUp(250, () => {
        $('#toggleUsersViewBtn').attr('src', 'file:///images/chevron_down_20.png')
      })
    }
  })

  $('#createChannelBtn').on('click', () => {
    $('#modal-createChannel').toggle('fade', 200)
    $('#chnl-hr').attr('data-content', '')
    $('#modal-createChannel-nameInput').val('')
    $('#modal-createChannel-nameInput').focus()
  })

  $('#modal-createChannel-okButton').on('click', () => {
    var channelName = $('#modal-createChannel-nameInput').val().replace(new RegExp('#', 'g'), '').trim()
    if(channelName.length > 0){
      var channelPos = $('#chnl-panel > li').length
      new Channel('#' + channelName).create(channelPos, ['everyone'])
      $('#modal-createChannel').toggle('fade', 200, () => {
        if($('#configPanel').css('display') != 'none'){
          $('#chnl-hr').attr('data-content', funcs.getActiveChannel())
        }else{
          $('#chnl-hr').attr('data-content', 'Configuración')
        }
      })
    }else{
      funcs.addAlert('Necesitas especificar un nombre válido', 'alert-red')
      $('#modal-createChannel-nameInput').focus()
    }
  })

  $('#modal-createChannel-cancelButton').on('click', () => {
    $('#modal-createChannel').toggle('fade', 200, () => {
      if($('#configPanel').css('display') != 'none'){
        $('#chnl-hr').attr('data-content', funcs.getActiveChannel())
      }else{
        $('#chnl-hr').attr('data-content', 'Configuración')
      }
    })
  })

  $('#mainInput').on('keypress', function(e){
    if(e.which == 13){
      if($(this).val().trim() != ''){
        var time = +new Date
        var message = new Message(vars.socket.id, vars.me.username, time, funcs.getActiveChannel(), $(this).val().trim())
        message.send()
      }
      $(this).val('')
    }
  })

  $('#submitLogin').on('click', () => {
    $('#submitLogin').prop('disabled', true)
    funcs.addAlert('Conectando con el servidor...', 'alert-purple')
    var options = {}
    var username = $('#loginUsernameInput').val().trim()
    var pwd = $('#loginPasswordInput').val().trim()
    var user = new User(username)
    user.user_id = null
    user.password = pwd
    if($('#hostLoginInput').val().trim() != '' || $('#portLoginInput').val().trim() != ''){
      options = {host: $('#hostLoginInput').val().trim(), port: $('#portLoginInput').val().trim()}
    }
    user.login(options)
  })

  $('#loginMoreOptions').on('click', () => {
    if($('#loginMoreOptionsGroup').css('display') == 'none'){
      $('#loginMoreOptionsGroup').slideDown(250)
    }else{
      $('#loginMoreOptionsGroup').slideUp(250)
    }
  })

  $('.no-class-controlImages').on('click', function(){
    switch($(this).attr('id')){
      case 'searchBtn':
        if($('#configPanel').css('display') == 'none'){
          $('#searchInput').val('')
          $('#searchPanel').toggle('slide', {direction: 'right'}, 200, () => {
            $('#searchedMessages').html('')
            $('#foundMessagesSubTitle').css('display', 'none')
            $('#searchInput').focus()
          })
        }
        break
      case 'notifBtn':
        vars.me.status.main = 'online'

        if($('#notifBtn').attr('src') == 'file:///images/notif1_20.png'){
          $('#notifBtn').attr('src', 'file:///images/notif2_20.png')  
          vars.me.status.notif = true
        }else{
          $('#notifBtn').attr('src', 'file:///images/notif1_20.png')
          vars.me.status.notif = false
        }
    
        vars.me.updateStatus()
        break
      case 'cogBtn':
        if($('#searchPanel').css('display') == 'block'){
          $('#searchPanel').toggle('slide', {direction: 'right'}, 200)
        }

        $('#configPanel').toggle('slide', {direction: 'down'}, 300)

        if(!$('#chnl-hr').attr('data-content').startsWith('#')){
          $('#chnl-hr').attr('data-content', funcs.getActiveChannel())
        }else{
          $('#chnl-hr').attr('data-content', 'Configuración')
        }
        break
    }
  })

  $('#searchInput').on('keypress', function(e){
    if(e.which == 13){
      vars.socket.emit('searchMessages', {user: vars.me, message: $(this).val().trim(), channel: funcs.getActiveChannel()})
    }
  })

  $('#searchInput').on('input', () => {
    $('#searchedMessages').html('')
    $('#foundMessagesSubTitle').css('display', 'none')
  })

  $('#configOptionsList > li').on('click', function(){
    $('#configOptionsList > li').removeClass('configOptionsListItemActive')
    $(this).addClass('configOptionsListItemActive')
  })

  $('.color').on('click', function(){
    $('.color').css('box-shadow', 'none');
    $(this).css({'background': 'white !important', 'box-shadow': funcs.hexToRgb($(this).attr('data-color'), 0.3) + ' 0px 0px 0px 4px'});
  })

  $('#mainInput').on('keydown', (event) => {
    if (event.keyCode === $.ui.keyCode.TAB) {
      event.preventDefault()
    }
  }).autocomplete({
    minLength: 1,
    position: {my : 'left bottom-10', at: 'left top'},
    source: (request, response) => {
      var term = request.term, results = []
      if (term.indexOf('@') >= 0) {
        term = funcs.extractLastAutocomplete(request.term)
        if (term.length > 0) {
          results = new RegExp('^' + $.ui.autocomplete.escapeRegex(term), 'i')
          response($.grep(vars.users, (item) => {
            return results.test(item)
          }))
        }else{
          response(vars.users)
        }
      }else{
        response(results)
      }
    },
    focus: () => {
      return false
    },
    select: function(e, ui) {
      var pos = this.selectionStart
      var substr = this.value.substring(0, pos)
      var lastIndex = substr.lastIndexOf('@')
      if (lastIndex >= 0){
        var prependStr = this.value.substring(0, lastIndex)
        this.value = prependStr + ui.item.value + this.value.substr(pos)
        funcs.setCaretPosition(this, prependStr.length + ui.item.value.length + 1)
      }    
      return false
    }
  })

  $(window).on('dragover', (e) => {
    e.stopPropagation()
    e.preventDefault()
    return true
  })

  document.body.ondrop = (ev) => {
    ev.preventDefault()
    const imageUrl = ev.dataTransfer.getData('url')
    funcs.imageUrlToB64(imageUrl, function(b64){
      var buff = Buffer.from(b64, 'base64')
        jimp.read(buff).then((img) => {
          //Se reduce la calidad de la imagen
          var reducedImagePromise = img.quality(60).getBase64Async(jimp.MIME_JPEG)
          reducedImagePromise.then((result) => {
            if(img.bitmap.width > 0 && img.bitmap.height > 0){
              var time = +new Date
              var message = new Message(vars.socket.id, vars.me.username, time, funcs.getActiveChannel(), '')
              message.image = result
              message.send()
            }else{
              funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
            }
          })
        }).catch(() => {
          funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
        })
    })
  }

  $(window).on('drop', (e) =>{
    e.preventDefault()
    e.stopPropagation()

    for(let f of e.originalEvent.dataTransfer.files) {
      var type = f.type.split('/')
      if(vars.socket.connected && type[0] == 'image'){
        jimp.read(f.path).then((img) => {
          //Se reduce la calidad de la imagen
          var reducedImagePromise = img.quality(60).getBase64Async(jimp.MIME_JPEG)
          reducedImagePromise.then((result) => {
            if(img.bitmap.width > 0 && img.bitmap.height > 0){
              var time = +new Date
              var message = new Message(vars.socket.id, vars.me.username, time, funcs.getActiveChannel(), '')
              message.image = result
              message.send()
            }else{
              funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
            }
          })
        }).catch(() => {
          funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
        })
      }else{
        //TODO: Otros tipos de archivo
      }
    }

    return false
  })

  $(window).on('paste', (event) => {
    var items = (event.clipboardData  || event.originalEvent.clipboardData).items
    var blob = null
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        blob = items[i].getAsFile()
      }
    }

    if(blob != null){
      var reader = new FileReader()
      reader.onload = function(event) {
        var buff = Buffer.from(event.target.result.substring(22, event.target.result.length), 'base64')
        jimp.read(buff).then((img) => {
          //Se reduce la calidad de la imagen
          var reducedImagePromise = img.quality(60).getBase64Async(jimp.MIME_JPEG)
          reducedImagePromise.then((result) => {
            if(img.bitmap.width > 0 && img.bitmap.height > 0){
              var time = +new Date
              var message = new Message(vars.socket.id, vars.me.username, time, funcs.getActiveChannel(), '')
              message.image = result
              message.send()
            }else{
              funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
            }
          })
        }).catch(() => {
          funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
        })
      }
      reader.readAsDataURL(blob)
    }
  })

  $(window).on('click', () => {
    if(vars.me != null){
      if(vars.me.status.main != 'online'){
        clearTimeout(absentTimeout)
        vars.me.status.main = 'online'
        vars.me.updateStatus()
      }
    }
    if(contextMenuVisible) funcs.toggleMenu($('.contextmenu'), 'hide')
  })

  $(window).on('blur', () => {
    if(vars.me != null){
      absentTimeout = setTimeout(() => {
        vars.me.status.main = 'absent'
        vars.me.updateStatus()
      }, 60000) //60 secs
    }
  })

  $(window).on('focus', () => {
    if(vars.me != null){
      if(vars.me.status.main != 'online'){
        clearTimeout(absentTimeout)
        vars.me.status.main = 'online'
        vars.me.updateStatus()
      }
    }
  })

  $(window).on('resize', function(){
    funcs.scroll()
  })
})