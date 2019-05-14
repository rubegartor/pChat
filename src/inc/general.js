var crypto = require('crypto')

module.exports = {
  sha1: (string) => {
    return crypto.createHash('sha1').update(string, 'binary').digest('hex')
  },

  toggleMenu: (menu, command) => {
    if(command == 'show')
      menu.css('display', 'block')
    else
      menu.css('display', 'none')
  
    contextMenuVisible = !contextMenuVisible
  },

  setPosition: function(menu, pos){
    menu.css('left', pos.left + 'px')
    menu.css('top', pos.top + 'px')
    this.toggleMenu(menu, 'show')
  },

  loadChannelMessages: () => {
    $('#chat-messages').html('')
    vars.socket.emit('getChannelMessages', vars.activeChannel)
  },

  scroll: () =>{
    $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight - $('#chat-messages')[0].clientHeight);
  }
};

