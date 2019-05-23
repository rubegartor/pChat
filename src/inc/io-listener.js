module.exports = () => {
  vars.socket.on('loginRequestResponse', (response) => {
    if(response.status == 'ok'){
      vars.socket.emit('updateSocketId')
      vars.socket.emit('getChannels')
      $('#mainInput').css('display', 'block')
      $('#sidebar').css('visibility', 'visible')
      $('#controlImages').css('display', 'block')
      $('#chatTop').css('width', 'calc(100% - ' + ($('#controlImages').width() + $('#sidebar').width() + 30) + 'px)')
      $('#loginBg').remove()
    }else{
      vars.socket.disconnect()
    }
  })

  vars.socket.on('setChannels', (channels) => { 
   channels = channels.sort((a,b) => (a.name < b.name) ? 1 : ((b.name < a.name) ? -1 : 0)) //Se ordenan los objetos en orden alfabetico segun el nombre del canal
    channels.forEach(channel => {
      var chn = new Channel(channel.name)
      $('#chnl-panel').append(chn.toHTML())
    })

    funcs.selectFirstChannel()
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

  vars.socket.on('messageResponse', (msg) => {
    var datetime = new Date(msg.time)
    var time = ('0' + datetime.getHours()).slice(-2) + ':' + ('0' + datetime.getMinutes()).slice(-2)
    var message = new Message(msg.id, msg.user_id, msg.username, time, msg.channel, msg.content)

    if($('#chat-messages > div').length == 0){
      $('#chat-messages').append(message.toHTML())
    }else{
      if($('#chat-messages > div:last > div:last > span').attr('user_id') == message.user_id){
        $('#chat-messages > div:last > div:last').append(message.toAppend())
      }else{
        $('#chat-messages').append(message.toHTML())
      }
    }

    funcs.scroll()
  })
  
  vars.socket.on('getChannelMessagesResponse', (resp) => {
    resp.messages.forEach((msg) => {
      var datetime = new Date(msg.time)
      var time = ('0' + datetime.getHours()).slice(-2) + ':' + ('0' + datetime.getMinutes()).slice(-2)
      var message = new Message(msg.id, msg.user_id, msg.username, time, msg.channel, msg.content)

      if($('#chat-messages > div').length == 0){
        $('#chat-messages').append(message.toHTML())
      }else{
        if($('#chat-messages > div:last > div:last > span').attr('user_id') == message.user_id){
          $('#chat-messages > div:last > div:last').append(message.toAppend())
        }else{
          $('#chat-messages').append(message.toHTML())
        }
      }

      funcs.scroll()
    })
  })

  vars.socket.on('removeMessageResponse', (message) => {
    var element = $('span[id="' + message.id + '"]')
    var elementParent = element.parent('div')
    var elementTime = elementParent.prev()
    var elementUser = elementTime.prev()
    var countChildren = elementParent.children().length - 1
    element.remove()
  
    if(countChildren == 0){
      elementParent.remove()
      elementTime.remove()
      elementUser.remove()
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
}