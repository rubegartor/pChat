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

  createContextMenus: function() {
    var messageContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-editMsgBtn').text('Editar mensaje'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-removeMsgBtn').text('Eliminar mensaje')
    ]
  
    var channelContextMenuOptions = [
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-editChannelBtn').text('Editar canal'),
      $('<li>').addClass('menu-option').attr('id', 'contextmenu-removeChannelBtn').text('Eliminar canal')
    ]
  
    var messageContextMenuFuncs = [contextFuncs.editMessage, contextFuncs.removeMessage]
    var channelContextMenuFuncs = [contextFuncs.editChannel, contextFuncs.removeChannel]
  
    this.addContextMenu($('#chat-messages'), '.message-line', messageContextMenuOptions, messageContextMenuFuncs)
    this.addContextMenu($('#chnl-panel'), 'li', channelContextMenuOptions, channelContextMenuFuncs)
  },

  loadChannelMessages: () => {
    $('#chat-messages').html('')
    vars.socket.emit('getChannelMessages', vars.activeChannel)
  },

  scroll: () => {
    $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight - $('#chat-messages')[0].clientHeight);
  },

  selectFirstChannel: () => {
    if($('#chnl-panel > li').length > 0){
      if($('#chnl-panel > li:first').text() != vars.activeChannel){
        $('#chnl-panel > li:first').click()
        $('#mainInput').prop('disabled', false)
        $('#chnl-hr').attr('data-content', $('#chnl-panel > li:first').text())
        vars.activeChannel = $('#chnl-panel > li:first').text()
      }
    }else{
      $('#mainInput').prop('disabled', true)
      $('#chnl-hr').attr('data-content', "")
      vars.activeChannel = ""
    } 
  }
};

