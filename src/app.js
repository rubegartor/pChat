const $ = require('jquery')
const electron = require('electron')
const remote = electron.remote
const vars = require('../inc/vars')
const funcs = require('../inc/general')
const Message = require('../inc/message')
const Channel = require('../inc/channel')
const User = require('../inc/user')
const contextFuncs = require('../inc/contextFuncs')

let contextMenuVisible = false

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
    $('#chnl-panel > li').removeClass('active-channel')
    $('#mainInput').prop('disabled', false)
    $(this).addClass('active-channel')
    $('#chnl-hr').attr('data-content', $(this).text())
    new Channel($(this).text()).join()
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
          new Channel('#' + channelName).create()
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
        var message = new Message(funcs.sha1((new Date(time).getTime() + vars.socket.id).toString()), vars.socket.id, 'rubegartor', time, funcs.getActiveChannel(), $(this).val().trim())
        message.send()
      }
      $(this).val('')
    }
  })
  
  $(window).on('click', () => {
    if(contextMenuVisible) funcs.toggleMenu($('.contextmenu'), 'hide')
  })

  $('.collapsible').on('click', function(){
    $('.collapsible').removeClass('collapsible-active')
    if($(this).next().css('maxHeight') != '0px'){
      $(this).next().css('maxHeight', '0px')
    }else{
      $(this).addClass('collapsible-active')
      $(this).next().css('maxHeight', $(this).next().prop('scrollHeight') + 'px')
    }
  })

  $('#submitLogin').on('click', () => {
    var username = $('#loginUsernameInput').val().trim()
    var pwd = $('#loginPasswordInput').val().trim()
    var user = new User(null, username, pwd)
    user.login()
  })
})