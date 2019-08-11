const $ = require('jquery')
const {ipcRenderer} = require('electron')
const electron = require('electron')
const remote = electron.remote

ipcRenderer.on('notif', function (e, data) {
  $('#iconBg').addClass(data.color)
  $('#iconBg > img').attr('src', data.icon)
  $('#title').text(data.title).addClass(data.color)
  $('#content').text(data.content)
});

$(document).ready(function(){
  $('#closeNotif').attr('src', 'file:///' + remote.app.getAppPath() + '/images/close_20.png')
  startAnim()

  $('#closeNotif').on('click', () => {
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
        window.close()
      })
    }, 2500)
  }
})