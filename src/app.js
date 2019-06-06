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
const contextFuncs = require('../inc/contextFuncs')

let contextMenuVisible = false
let absentTimeout = null

$(document).ready(function(){
  funcs.createContextMenus()

  $('#chnl-panel').sortable({
    placeholder: 'channel-placeholder',
    update: function() {
      var final = []
      $('#chnl-panel > li').each(function() {
        final.push({chnName: $(this).text(), pos: $(this).index()})
      })
      funcs.updateChannelIndex(final)
    }
  })

  $('#chnl-panel').disableSelection()

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
      $('#chnl-panel > li').removeClass('active-channel')
      $('#mainInput').prop('disabled', false)
      $(this).addClass('active-channel')
      $('#chnl-hr').attr('data-content', $(this).text())
      new Channel($(this).text()).join()
      funcs.loadChannelMessages()
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
    $('#createChannelBtn').css('display', 'none')
    var input = $('<input>').addClass('channelInput').attr('placeholder', 'Nuevo canal...')
    $('#chnl-panel').append(input)
    input.focus()

    var channelContextMenuOptions = [$('<li>').addClass('menu-option').attr('id', 'contextmenu-cancelChannelBtn').text('Cancelar')]
    var channelContextMenuFuncs = [contextFuncs.cancelCreateChannel]
    funcs.addContextMenu($('#chnl-panel'), 'input', channelContextMenuOptions, channelContextMenuFuncs)

    input.on('keypress', (e) => {
      if(e.which == 13){
        var channelName = input.val().replace(new RegExp('#', 'g'), '').trim()
        if(channelName.length > 0){
          var channelPos = $('#chnl-panel > li').length
          new Channel('#' + channelName).create(channelPos)
          input.remove()
          $('#createChannelBtn').css('display', 'block')
        }
      }
    })
  })

  $('#mainInput').on('keypress', function(e){
    if(e.which == 13){
      if($(this).val().trim() != ''){
        var time = +new Date
        var message = new Message(funcs.sha1((new Date(time).getTime() + vars.socket.id).toString()), vars.socket.id, vars.me.username, time, funcs.getActiveChannel(), $(this).val().trim())
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

  $('#notifBtn').on('click', () => {
    vars.me.status.main = 'online'

    if($('#notifBtn').attr('src') == 'file:///images/notif1_20.png'){
      $('#notifBtn').attr('src', 'file:///images/notif2_20.png')  
      vars.me.status.notif = true
    }else{
      $('#notifBtn').attr('src', 'file:///images/notif1_20.png')
      vars.me.status.notif = false
    }

    vars.me.updateStatus()
  })

  $('#cogBtn').on('click', () => {
    $('#configPanel').toggle('slide', {direction: 'down'}, 300)

    if($('#chatTop > hr').hasClass('hr-text-config')){
      $('#chatTop > hr').removeClass('hr-text-config')
    }else{
      $('#chatTop > hr').addClass('hr-text-config')
    }
  })

  $('#searchBtn').on('click', () => {
    $('#searchPanel').toggle('slide', {direction: 'right'}, 200)
  })

  $(window).on('dragover', (e) => {
    e.stopPropagation()
    e.preventDefault()
    return true
  })

  $(window).on('drop', (e) =>{
    e.preventDefault()
    e.stopPropagation()

    for(let f of e.originalEvent.dataTransfer.files) {
      var type = f.type.split('/')
      if(vars.socket.connected && type[0] == 'image'){
        var b64 = funcs.base64Encode(f.path)
        var buff = Buffer.from(b64, 'base64')

        jimp.read(buff).then((img) => {
          if(img.bitmap.width > 0 && img.bitmap.height > 0){
            var time = +new Date
            var message = new Message(funcs.sha1((new Date(time).getTime() + vars.socket.id).toString()), vars.socket.id, vars.me.username, time, funcs.getActiveChannel(), '')
            message.image = b64
            message.send()
          }else{
            funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
          }
        }).catch(() => {
          funcs.addAlert('La imagen que estas intentando enviar no es válida', 'alert-red')
        })
      }else{
        //Otros tipos de archivo
      }
    }

    return false
  })

  $('#mainInput').on('keydown', function(event) {
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

  $(window).on('click', () => {
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