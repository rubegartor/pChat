const $ = require('jquery')
const io = require('socket.io-client')
const remote = require('electron').remote
const vars = require('./inc/vars')
const funcs = require('./inc/general')
const Message = require('./inc/message')
const Channel = require('./inc/channel')

let contextMenuVisible = false
var username = 'SoyUnUsuario'

vars.socket = io.connect('http://marsweb.ddns.net:1234')

require('./inc/io-listener')()

$(document).ready(function(){
  $('#close-btn').on('click', () => {
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
    $('#chnl-panel > li').removeClass('active-channel')
    $(this).addClass('active-channel')
    vars.activeChannel = $(this).text()
    $('#chnl-hr').attr('data-content', $(this).text())
    funcs.loadChannelMessages()
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
    var input = $('<input>').addClass('channelInput')
    $('#chnl-panel').append(input)
    input.on('keypress', (e) => {
      if(e.which == 13){
        var channelName = input.val().replace(new RegExp('#', 'g'), '').trim()
        if(channelName.length > 0){
          new Channel('#' + channelName).create()
        }
      }
    })
  })

  $('#mainInput').on('keypress', function(e){
    function sendMessage(content){
      var datetime = new Date()
      var time = datetime.getHours() + ":" + datetime.getMinutes()
      var message = new Message(funcs.sha1((datetime.getTime() + vars.socket.id).toString()), vars.socket.id, username, time, vars.activeChannel, content)
      message.send()
    }

    if(e.which == 13){
      if($(this).val().trim() != ''){
        sendMessage($(this).val().trim())
      }
      $(this).val('')
    }
  })
  
  $(window).on('click', () => {
    if(contextMenuVisible) funcs.toggleMenu($('.contextmenu'), 'hide')
  })

  $('#chat-messages').on('contextmenu', '.message-line', (e) => {
    e.preventDefault()

    $('#contextmenu > ul').html('')
    $('#contextmenu > ul').append($('<li>').addClass('menu-option').attr('id', 'contextmenu-editMsgBtn').text('Editar mensaje'))
    $('#contextmenu > ul').append($('<li>').addClass('menu-option').attr('id', 'contextmenu-removeMsgBtn').text('Eliminar mensaje'))

    var id = $(e.currentTarget).attr('id')

    $('#contextmenu').off().on('click', '#contextmenu-removeMsgBtn', () => {
      var message = $('span[id="' + id + '"]')
      var content = $('span[id="' + id + '"]').text()
      var user_id = message.attr('user_id')
      var username = message.parent().prev().find('span.message-username').text()
      var time = message.parent().prev().find('span.message-time').text()

      var messageObj = new Message(id, user_id, username, time, vars.activeChannel, content)
      messageObj.remove()
      if(contextMenuVisible) funcs.toggleMenu($('.contextmenu'), 'hide')
    })

    const origin = {
      left: e.pageX,
      top: e.pageY
    }

    funcs.setPosition($('#contextmenu'), origin)
  })
})