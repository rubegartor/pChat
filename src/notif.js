const $ = require('jquery')
const remote = require('electron').remote
const {ipcRenderer} = require('electron');

ipcRenderer.on('notif', function (e, data) {
  $('#iconBg').addClass(data.color)
  $('#iconBg > img').attr('src', data.icon)
  $('#title').text(data.title).addClass(data.color)
  $('#content').text(data.content)
});

$(document).ready(function(){
  startAnim()

  $('#closeNotif').on('click', () => {
    var window = remote.getCurrentWindow()
    window.close()
  })

  $('#notif').on('mouseenter', function(){
    $(this).stop()
    $('.notification').css('opacity', '1')
    setTimeout(() => { startAnim() }, 1500)
  })

  function startAnim(){
    setTimeout(() => {
      $('.notification').fadeOut(2600, () => {
        var window = remote.getCurrentWindow()
        window.close()
      })
    }, 2500)
  }
})