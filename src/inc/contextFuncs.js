const { clipboard } = require('electron')
const { dialog } = require('electron').remote
const fs = require('fs')

module.exports = {
  copyMessage: (clickedElement) => {
    if(window.getSelection().toString() != ''){
      clipboard.writeText(window.getSelection().toString())
    }else{
      clipboard.writeText(clickedElement.text())
    }
  },

  editMessage: (clickedElement) => {
    console.log('edit Message')
  },
  
  removeMessage: (clickedElement) => {
    var id = clickedElement.attr('id')
    var message = $('span[id="' + id + '"]')
    var content = $('span[id="' + id + '"]').text()
    var username = message.parent().prev().find('span.message-username').text()
    var time = message.parent().prev().find('span.message-time').text()

    var msg = new Message(new User(username), time, funcs.getActiveChannel(), content)
    msg._id = id
    msg.remove()
  },

  editChannel: (clickedElement) => {
    var beforeText = clickedElement.text().replace(new RegExp('#', 'g'), '')
    var input = $('<input>').addClass('editChannelInput').val(beforeText).attr('placeholder', 'Nuevo canal...')
    clickedElement.html(input)

    input.on('keypress', (e) => {
      if(e.which == 13){
        var newName = input.val().replace(new RegExp('#', 'g'), '').trim()
        new Channel(beforeText).editName(clickedElement, newName)
      }
    })
  },

  removeChannel: (clickedElement) => {
    new Channel(clickedElement.text()).remove()
  },

  cancelCreateChannel: () => {
    $('#createChannelBtn').css('display', 'block')
    $('#chnl-panel > input').remove()
  },

  infoChannel: (clickedElement) => {
    console.log('info Channel')
  },

  copyMainInput: (clickedElement) => {
    if(window.getSelection().toString() != ''){
      clipboard.writeText(window.getSelection().toString())
    }else{
      clipboard.writeText(clickedElement.val())
    }
  },

  pasteMainInput: () => {
    $('#mainInput').val($('#mainInput').val() + clipboard.readText())
    $('#mainInput').focus()
  },

  clearMainInput: () => {
    $('#mainInput').val('')
  },

  selectAllMainInput: () => {
    $('#mainInput').select()
  },

  saveImage: (clickedElement) => {
    var savePath = dialog.showSaveDialog({filters: [{ name: 'Imágenes (.png)', extensions: ['png'] }]})

    if(savePath != undefined){
      var imageBuffer = clickedElement.attr('src').replace('data:image/png;base64,', '')
      fs.writeFile(savePath, imageBuffer, 'base64', function(err) {
        if(err){
          funcs.addAlert('No se ha podido guardar la imagen', 'alert-red')
        }else{
          funcs.addAlert('Se ha guardado la imagen', 'alert-green')
        }
      })
    }
  }
}
