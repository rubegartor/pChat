var crypto = require('crypto')

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
    menu.css({'left': pos.left + 'px', 'top': pos.top + 'px'})
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

