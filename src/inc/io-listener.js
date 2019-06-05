module.exports = () => {
  vars.socket.on('disconnect', () => {
    $('#mainInput').css('display', 'none')
    $('#sidebar').css('visibility', 'hidden')
    $('#controlImages').css('display', 'none')
    $('#chatTop').css('left', '100px')
    $('#chatTop').css('width', 'calc(100% - 120px)')
    $('#loginBg').css('display', 'block')
    $('#chnl-hr').attr('data-content', '')

    try{
      vars.socket.disconnect()
    }catch(err){}
    vars.socket = null
    vars.me = null

    $('#submitLogin').prop('disabled', false)
  })

  vars.socket.on('loginRequestResponse', (response) => {
    if(response.status == 'ok'){
      var user = new User(response.username)
      user.user_id = vars.socket.id
      user.password = null
      user.status = response.user_status

      vars.me = user
      
      vars.socket.emit('getChannels')
      vars.socket.emit('getUsersOnline')

      $('#mainInput').css('display', 'block')
      $('#sidebar').css('visibility', 'visible')
      $('#controlImages').css('display', 'block')
      $('#chatTop').css('width', 'calc(100% - ' + ($('#controlImages').width() + $('#sidebar').width() + 40) + 'px)')
      $('#chatTop').css('left', '260px')
      $('#loginBg').css('display', 'none')

      funcs.loadUserConfig()
    }else{
      funcs.addAlert(response.message, 'alert-red')
      vars.socket.disconnect()
    }
  })

  vars.socket.on('setChannels', (channels) => {
    $('#chnl-panel').html('')
   channels = channels.sort((a,b) => (a.position > b.position) ? 1 : ((b.position > a.position) ? -1 : 0)) //Se ordenan los objetos segun su posicion
    channels.forEach(channel => {
      var chn = new Channel(channel.name)
      $('#chnl-panel').append(chn.toHTML())
    })

    funcs.selectFirstChannel()
  })

  vars.socket.on('updateChannels', (channels) => {
    var activeChn = $('#chnl-panel > li.active-channel').text()
    $('#chnl-panel').html('')
    channels = channels.sort((a,b) => (a.position > b.position) ? 1 : ((b.position > a.position) ? -1 : 0)) //Se ordenan los objetos segun su posicion
      channels.forEach(channel => {
        var chn = new Channel(channel.name)
        $('#chnl-panel').append(chn.toHTML())
    })

    $('#chnl-panel > li').each(function() {
      if($(this).text() == activeChn){
        $(this).addClass('active-channel')
      }
    })
  })

  vars.socket.on('editChannelResponse', (newChannel) => {
    $('#chnl-panel > li').each(function() {
      if($(this)[0].hasAttribute('beforeText')){
        if($(this).attr('beforeText') == newChannel.toEdit){
          $(this).attr('beforeText', newChannel.newChannel.name)
          $(this).html('')
          $(this).text(newChannel.newChannel.name)
        }
      }
    })
  })

  vars.socket.on('createChannelResponse', function(resp){
    if(resp.status == 'ok'){
      var channel = new Channel(resp.data.name)
      var channelLength = $('#chnl-panel > li').length
      $('#chnl-panel').append(channel.toHTML())

      if(channelLength == 0){
        funcs.selectFirstChannel()
      }
    }else{
      funcs.addAlert('El canal ya existe', 'alert-yellow')
    }
  })

  vars.socket.on('removeChannelResponse', (channel) => {
    $('#chnl-panel > li').each(function() {
      if($(this).text() === channel.name){
        $(this).remove()
        return false
      }
    })

    if(funcs.getActiveChannel().length == 0){
      $('#chat-messages').html('')
      funcs.selectFirstChannel()
    }
  })

  vars.socket.on('messageResponse', (msg) => {
    var datetime = new Date(msg.time)
    var message = new Message(msg.id, msg.user_id, msg.username, datetime, msg.channel, msg.content)
    if(msg.image != null){
      message.image = msg.image
    }

    if($('#chat-messages > div').length == 0){
      $('#chat-messages').append(message.toHTML())
    }else{
      if($('#chat-messages > div:last > div:last > span').attr('user_id') == message.user_id){
        var datetimePrev = new Date($('#chat-messages > div:last > div:last > span').attr('datetime'))
        datetimePrev = new Date(datetimePrev.setMinutes(datetimePrev.getMinutes() + 15)) //15 min

        if(datetimePrev < datetime){
          $('#chat-messages').append(message.toHTML())
        }else{
          $('#chat-messages > div:last > div:last').append(message.toAppend())
        }
      }else{
        $('#chat-messages').append(message.toHTML())
      }
    }

    funcs.scroll()
  })
  
  vars.socket.on('getChannelMessagesResponse', (resp) => {
    resp.messages = resp.messages.reverse()
    resp.messages.forEach((msg) => {
      var datetime = new Date(msg.time)
      var message = new Message(msg.id, msg.user_id, msg.username, datetime, msg.channel, msg.content)
      if(msg.image != null){
        message.image = msg.image
      }

      if($('#chat-messages > div').length == 0){
        $('#chat-messages').append(message.toHTML())
      }else{
        if($('#chat-messages > div:last > div:last > span').attr('user_id') == message.user_id){
          $('#chat-messages > div:last > div:last').append(message.toAppend())
        }else{
          $('#chat-messages').append(message.toHTML())
        }
      }
    })
    
    funcs.scroll()
  })

  vars.socket.on('removeMessageResponse', (message) => {
    var element = $('span[id="' + message.id + '"]')
    var elementParent = element.parent('div')
    var elementContainer = elementParent.parent()
    var elementTime = elementParent.prev()
    var elementUser = elementTime.prev()
    var countChildren = elementParent.children().length - 1
    element.remove()
  
    if(countChildren == 0){
      elementContainer.remove()
      elementParent.remove()
      elementTime.remove()
      elementUser.remove()
    }
  })

  vars.socket.on('getUsersOnlineResponse', (users) => {
    var finalUsers = []
    $('#usrs-panel').html('')
    users.forEach((user) => {
      finalUsers.push('@' + user.username)
      var statusColor = 'gray'
      if(user.status.notif != false){
        switch(user.status.main) {
          case 'online':
            statusColor = 'green'
            break;
          case 'absent':
            statusColor = 'yellow'
            break;
        } 
      }else{
        statusColor = 'red'
      }

      vars.users = finalUsers
      $('#usrs-panel').append('<li><div class="status ' + statusColor + '"></div>' + user.username + '</li>')
    })
  })
}