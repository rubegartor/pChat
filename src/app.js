const $ = require('jquery')
const io = require('socket.io-client')
const electron = require('electron')
const remote = electron.remote
const vars = require('../inc/vars')
const funcs = require('../inc/general')
const Message = require('../inc/message')
const Channel = require('../inc/channel')

let contextMenuVisible = false
var username = 'rubegartor'

const socketOptions = {
  secure: true,
  reconnect: true,
  rejectUnauthorized : false //INFO: Si el certificado es self-signed necesitas utilizar rejectUnauthorized = false, por lo tanto se queda expuesto a un posible ataque MiTM
}

vars.socket = io.connect('https://localhost:1234', socketOptions)

require('../inc/io-listener')()

$(document).ready(function(){
  funcs.createContextMenus()

  $('#close-btn').on('click', () => {
    funcs.closeAllWindows() //Si hay notificaciones activas las cierra antes de cerrar la ventana principal
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
    $('#mainInput').prop('disabled', false)
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
    var input = $('<input>').addClass('channelInput').attr('placeholder', 'Nuevo canal...')
    $('#chnl-panel').append(input)
    input.on('keypress', (e) => {
      if(e.which == 13){
        var channelName = input.val().replace(new RegExp('#', 'g'), '').trim()
        if(channelName.length > 0){
          new Channel('#' + channelName).create()
          input.remove()
        }
      }
    })
  })

  $('#mainInput').on('keypress', function(e){
    if(e.which == 13){
      if($(this).val().trim() != ''){
        var datetime = new Date()
        var time = ('0' + datetime.getHours()).slice(-2) + ":" + ('0' + datetime.getMinutes()).slice(-2)
        var message = new Message(funcs.sha1((datetime.getTime() + vars.socket.id).toString()), vars.socket.id, username, time, vars.activeChannel, $(this).val().trim())
        message.send()
      }
      $(this).val('')
    }
  })
  
  $(window).on('click', () => {
    if(contextMenuVisible) funcs.toggleMenu($('.contextmenu'), 'hide')
  })
})