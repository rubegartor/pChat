const $ = require('jquery');
const io = require('socket.io-client');
const remote = require('electron').remote;
const {ipcRenderer} = require('electron');
const {Menu, MenuItem, dialog} = remote;
const fs = require('fs');
const path = require('path');

const menuMessage = new Menu();
const menuImage = new Menu();

menuMessage.append(new MenuItem ({
  label: 'Editar mensaje',
  click() {
    editMessage();
  }
}));

menuMessage.append(new MenuItem ({
  label: 'Eliminar mensaje',
  click() {
    removeMessage();
  }
}));

menuImage.append(new MenuItem ({
  label: 'Guardar Imagen',
  click() {
    saveImage();
  }
}));

//Client variables
var availableColors = ['#FFFFFF', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF5722', '#795548', '#607D8B'];
var socket = null; //Variable que almacena el objeto socket
var username = ''; //Variable que almacena el nombre de usuario
var validUsername = false; //Variable para comprobar si el nombre de usuario ha sido aceptado por el servidor
var winFocus = true;  //Variable que comprueba si la ventana esta activa o no
var unreaded = 0; //Variable que almacena el numero de mensajes no leidos
var mainWindowState = false; //Variable que almacena el estado de la pantalla principal (Si hay paneles activos superpuestos o no)
var config = null; //Variable que almacena la configuración de usuario
var userColorSelectedTmp = null; //Variable que almacena el color seleccionado en la configuración por el usuario
var lastMessageIDSended = null; //Variable que almacena el identificador del ultimo mensaje enviado
var messageData = null; //Variable que almacena la informacion del mensaje cuando se trabaja con contextmenu
var saveImageData = null; //Variable que almacena la informacion de la imagen cuando se trabaja con contextmenu
var isEditing = false; //Variable que almacena el estado de edición del usuario, si está editando un mensaje o no

//Main Context Events 
ipcRenderer.on('openConfig', () => {
  openConfiguration();
});

ipcRenderer.on('focusSender', () => {
  $('input#msgSendTextBox').focus();
});

ipcRenderer.on('toggleNotifications', () => {
  config.general.showNotifications = !config.general.showNotifications;
  dumpConfig();
});

fs.watchFile('./includes/settings.json', {'interval': 1000}, () => {
  loadConfig();
  networkPanelLoad();
  generalPanelLoad();

  if(socket != null){
    if(socket.connected){
      socket.emit('updateColor', {color: config.general.userColor, userId: socket.id})
    }
  }
});

function loadConfig(){
  var contents = fs.readFileSync('./includes/settings.json', 'utf8');

  try{
    config = JSON.parse(contents);
  }catch(err){
    dialog.showErrorBox('Error con el archivo de configuración', 'La estructura del archivo settings.json no es correcta');
    remote.app.isQuiting = true;
    remote.app.quit();
  }
}

//On startup (load Config)
loadConfig();
checkValidUsernameColor();
//End startup (load Config)

function openConfiguration(){
  if(!config.general.firstRun){
    mainWindowState = false;

    networkPanelLoad();
    generalPanelLoad();
    if(socket != null){
      if(socket.connected){
        userPanelLoad();
      }
    }

    $('#pChatTitle').text('pChat - Configuración');
    $('#configWindow').fadeIn('fast', function() {
      if(socket != null){
        if(socket.connected){
          $('#configWindow').show();
        }else{
          addAlert('Aún no se ha establecido una conexión con el servidor', 'alert-yellow');  
        }
      }else{
        addAlert('Aún no se ha establecido una conexión con el servidor', 'alert-yellow');
      }
    });
    $('#configReturnBtn').on('click', function(){
      mainWindowState = true;
  
      $('#pChatTitle').text('pChat');
      $('#configWindow').fadeOut('fast', function() {
        $('#configWindow').hide();
        loadConfig();
      });
    });
  }
}

function base64Encode(file) {
  var body = fs.readFileSync(file);
  return body.toString('base64');
}

function scrollToBottom(){
  $('#chat').scrollTop($('#chat')[0].scrollHeight);
}

function getTime() {
  var date = new Date();
  return date.toLocaleTimeString(navigator.language, {
    hour: '2-digit',
    minute:'2-digit'
  });
}

function parseTime(time){
  var date = new Date(time);
  return date.toLocaleTimeString(navigator.language, {
    hour: '2-digit',
    minute:'2-digit'
  });
}

function dumpConfig(needRestart = false){
  fs.writeFile('./includes/settings.json', JSON.stringify(config), function (err) {
    if (err){
      addAlert('No se ha podido guardar la nueva configuración.', 'alert-red');
    }else{
      if(needRestart){
        if(socket == null){
          relaunchApp();
        }else{
          $('#alert-restart').show();
          addAlert('Configuración actualizada, se requiere reinicio', 'alert-green');
        }
      }else{
        addAlert('Configuración actualizada.', 'alert-green');
      }
    }
  });
}

function showFullImage(img){
  var new_img = $('<img>').attr('src', img).addClass('main-image');
  $('.image-bg').on('click', function(){ $(this).hide() });
  $('#main-image > div').html('');
  $('#main-image > div').append(new_img);
  $('#main-image').show();
}

function updateBadge(){
  if(!winFocus && config.general.showCountMessages){
    unreaded += 1;
    ipcRenderer.sendSync('update-badge', unreaded);
  }
}

function checkLastMessage(){
  var el = $('#chat>ul>li:last').prev().prev().text();

  return el.substring(0, el.length - 1);
}

function addAlert(content, color){
  var alert = $('<div>').text(content).addClass('alert ' + color);
  $('#alertas').append(alert);
  setTimeout(function(){
    alert.fadeOut(1200, function(){
      $(this).remove();
    });
  }, 2000);
}

function formatBytes(bytes, decimals) {
  if(bytes == 0) return '0 Bytes';
  var k = 1024,
    dm = decimals <= 0 ? 0 : decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function hexToRgb(hex, opacity) {
  var h=hex.replace('#', '');
  h =  h.match(new RegExp('(.{'+h.length/3+'})', 'g'));

  for(var i=0; i<h.length; i++)
      h[i] = parseInt(h[i].length==1? h[i]+h[i]:h[i], 16) + 3;

  if (typeof opacity != 'undefined')  h.push(opacity);

  return 'rgba('+h.join(',')+')';
}

function removeMessage(){
  socket.emit('removeMessage', messageData.messageId);
}

function relaunchApp(){
  remote.app.isQuiting = true;
  remote.app.relaunch();
  remote.app.quit();
}

function saveImage(){
  var savePath = dialog.showSaveDialog({filters: [{ name: 'Imágenes (.png)', extensions: ['png'] }]});

  if(savePath != undefined){
    fs.writeFile(savePath, saveImageData, 'base64', function(err) {
      if(err){
        addAlert('No se ha podido guardar la imagen', 'alert-red');
      }else{
        addAlert('Se ha guardado la imagen', 'alert-green');
      }
    });
  }
}

function editMessage(){
  if(!isEditing){
    isEditing = true;
    var messageId = messageData.element.currentTarget.attributes[0].nodeValue; //Obtiene el messageId del elemento
    var messageText = $(messageData.element.currentTarget).text(); //Obtiene el texto del mensaje que se va a editar
    var editInput = $('<input type="text">').css({'margin': '10px 0px', 'width': '100%'}).val(messageText); //Se crea el input
    $(messageData.element.currentTarget).html(editInput); //Se reemplaza el texto con el input
    $('input#msgSendTextBox').prop('disabled', true); //Se desactiva el input principal
    editInput.focus();
    scrollToBottom();

    editInput.keyup(function(e){
      if(e.keyCode == 13){
        var newInputText = editInput.val();
        socket.emit('editMessage', {'messageId': messageId, 'newMsg': newInputText});
        $('input#msgSendTextBox').prop('disabled', false);
        $('input#msgSendTextBox').focus();
        isEditing = false;
      }
    });
  }
}

function updateUsernameColor(newColor, usernameId){
  var elements = $('#chat>ul>span');

  for(var i = 0; i < elements.length; i++){
    if(elements[i].hasAttribute('userId')){
      if($(elements[i]).attr('userId') == usernameId){
        $(elements[i]).css('color', newColor);
      }
    }
  }
}

function networkPanelLoad(){
  $('#hostIpInput').val(config.connection.host);
  $('#portInput').val(config.connection.port);
  $('#switch-1 > input').prop('checked', config.connection.reconnect);
}

function generalPanelLoad(){
  checkValidUsernameColor();
  $('.color').css('box-shadow', 'none');

  if(config.general.downloadPath != ''){
    $('#downloadPathInput').val(config.general.downloadPath);
  }else{
    $('#downloadPathInput').val('./downloads/');
  }

  if(config.general.trayKey != ''){
    $('#minimizeShortcut').val(config.general.trayKey);
  }else{
    $('#minimizeShortcut').val('Alt+Q');
  }

  if(config.general.notifKey != ''){
    $('#notifShortcut').val(config.general.notifKey);
  }else{
    $('#notifShortcut').val('Alt+E');
  }

  $('#notifStatus').text($('#notifShortcut').val());

  if(config.general.iconPath != ''){
    $('#iconPathInput').val(config.general.iconPath);
  }else{
    $('#iconPathInput').val('./includes/icns/icon.png');
  }

  $('#switch-3 > input').prop('checked', config.general.updateColors);
  $('#switch-4 > input').prop('checked', config.general.showCountMessages);
  $('#switch-5 > input').prop('checked', config.general.showNotifications);

  var colorElement = $('.color[data-color="' + config.general.userColor + '"]');
  userColorSelectedTmp = config.general.userColor;
  colorElement.css('box-shadow', hexToRgb(colorElement.attr('data-color'), 0.3) + ' 0px 0px 0px 4px');
}

function userPanelLoad(){
  if(socket != null){
    if(socket.connected){
      socket.emit('getUsers');
    }else{
      addAlert('Aún no se ha establecido una conexión con el servidor', 'alert-yellow');
    }
  }else{
    addAlert('Aún no se ha establecido una conexión con el servidor', 'alert-yellow');
  }
}

function checkValidUsernameColor(){
  if(!availableColors.includes(config.general.userColor)){
    config.general.userColor = '#FFFFFF';
    addAlert('Se ha encontrado un color no válido', 'alert-yellow');
    dumpConfig();
  }
}

function addNotification(content){
  if(config.general.showNotifications){
    ipcRenderer.send('newNotif', content);
  }
}

function connect(){
  formattedHost = 'http://' + config.connection.host + ':' + config.connection.port;
  socketOptions = {};

  if(!config.connection.reconnect)
    socketOptions = {'reconnect': false};

  socket = io.connect(formattedHost, socketOptions);

  socket.on('connect', function(){
    socket.emit('checkUsername', username);
  });

  socket.on('checkUserResponse', function(data){
    if(!data){
      socket.emit('newUsername', username);
      $('#login-main').remove();
      mainWindowState = true;
      $('input#msgSendTextBox').prop('disabled', false);
      $('input#msgSendTextBox').focus();
      addAlert('Conexión exitosa con el servidor', 'alert-green');
      validUsername = true;
    }else if(data){
      addAlert('El usuario introducido ya esta en uso', 'alert-yellow');
      socket.disconnect();
      $('input#usernameTextBox').prop('disabled', false);
    }
  });

  socket.on('disconnect', function(){
    if(validUsername){
      addAlert('Se ha perdido la conexión con el servidor', 'alert-red');
    }
    $('input#msgSendTextBox').prop('disabled', true);
  });

  socket.on('userConnected', function(username){
    addAlert('El usuario: ' + username + ' se ha conectado', 'alert-blue')
  });

  socket.on('userDisconnected', function(username){
    addAlert('El usuario: ' + username + ' se ha desconectado', 'alert-purple');
  });

  socket.on('imageResponse', function(msg){
    updateBadge();

    var lastMessageUsername = checkLastMessage();
    var finalImg = null;

    if(msg.b64Image.image.startsWith('data:image/png;base64,')){
      finalImg = msg.b64Image.image;
    }else{
      finalImg = 'data:image/png;base64, ' + msg.b64Image.image;
    }

    var img = $('<img>').attr('src', finalImg).addClass('imageMsg'); //Crea el elemento imagen
    img.on('click', function(){ //Añade el evento onclick al elemento imagen
      showFullImage($(this).attr('src'));
    });

    img.on('contextmenu', function(e) {
      e.preventDefault()
      var ImgSrc = e.currentTarget.attributes[0].nodeValue;
      saveImageData = ImgSrc.replace('data:image/png;base64,','');

      rightClickPosition = {x: e.x, y: e.y};
      menuImage.popup(remote.getCurrentWindow());
    });

    if(lastMessageUsername == msg.username){
      $('#chat>ul>li:last').append('<br/>').append(img);
    }else{
      var datetime = $('<span>').text(getTime()).addClass('time-right');
      var msgUsername = $('<span>').attr({userId: msg.usernameId}).css('color', msg.userColor).text(msg.username + ':').addClass('username');

      $('#msgList').append(msgUsername).append(datetime);
      $('#msgList').append($('<li>').append(img));
    }

    setTimeout(function(){ scrollToBottom(); }, 200);
  });

  socket.on('messageResponse', function(msg){
    updateBadge();

    var lastMessageUsername = checkLastMessage();
    var attributes = {messageId: msg.hash, userId: msg.usernameId};

    if(msg.mentions != null){
      msg.mentions.forEach(function(mention){
        msg.content = msg.content.replace(mention, '');
      });
    }

    var msgText = $('<span>').attr(attributes).html(msg.content).addClass('text-line');

    if(msg.mentions != null){
      msg.mentions.forEach(function(mention){
        if(mention.substring(2, mention.length - 1) == username || mention.substring(2, mention.length - 1) == 'everyone'){
          var notifContent = msg.content;
          if(notifContent == ''){
            notifContent = 'Te han mencionado en un mensaje';
          }
          addNotification({'title': 'Nueva mención', 'content': notifContent});
          msgText.addClass('mentionMsg');
        }
        var userMention = $('<span>').text(mention).addClass('mention');
        msgText.append(userMention);
      });
    }

    if(msg.usernameId == socket.id){
      lastMessageIDSended = msg.hash;
    }

    if(lastMessageUsername == msg.username){
      $('#chat>ul>li:last').append(msgText);
    }else{
      var datetime = $('<span>').text(getTime()).addClass('time-right');
      var msgUsername = $('<span>').attr({userId: msg.usernameId}).css('color', msg.userColor).text(msg.username + ':').addClass('username');

      $('#msgList').append(msgUsername).append(datetime).addClass('username');
      $('#msgList').append($('<li>').append(msgText));
    }

    msgText.on('contextmenu', function(e) {
      e.preventDefault()
      var messageId = e.currentTarget.attributes[0].nodeValue;
      var userId = e.currentTarget.attributes[1].nodeValue;

      if(socket.id == userId){
        rightClickPosition = {x: e.x, y: e.y};
        menuMessage.popup(remote.getCurrentWindow());
        messageData = {'element': e, 'messageId': messageId};
      }
    });

    scrollToBottom();
  });

  socket.on('fileResponse', function(file){
    updateBadge();

    var lastMessageUsername = checkLastMessage();

    var fileMsg = $('<div>').attr('id', file.hash).addClass('fileMsg');
    var image = $('<img>').attr('src', 'file:///includes/images/file_48.png');
    var fileMsgLeft = $('<div>').addClass('left').append(image);
    fileMsg.append(fileMsgLeft);
    var fileMsgCenter = $('<div>').addClass('center').text(file.filename);
    var fileMsgCenterSize = $('<div>').addClass('center').text('(' + formatBytes(file.size) + ')').addClass('light-text');
    fileMsg.append(fileMsgCenter);
    fileMsg.append(fileMsgCenterSize);

    if(lastMessageUsername == file.username){
      $('#chat>ul>li:last').append('<br/>').append(fileMsg);
    }else{
      var datetime = $('<span>').text(getTime()).addClass('time-right');
      var msgUsername = $('<span>').attr({userId: file.usernameId}).css('color', file.userColor).text(file.username + ':').addClass('username');

      $('#msgList').append(msgUsername).append(datetime).addClass('username');
      $('#msgList').append($('<li>').append(fileMsg));
    }

    setTimeout(function(){ scrollToBottom(); }, 200);
  });

  socket.on('downloadResponse', function(file){
    if (!fs.existsSync(config.general.downloadPath)){
      fs.mkdirSync(config.general.downloadPath);
    }

    var finalPath = config.general.downloadPath;

    if(finalPath != ''){
      finalPath = './downloads/';
    }

    if(!finalPath.endsWith('/') || !finalPath.endsWith('\\')){
      if(process.platform === 'win32'){
        //Windows Path
        finalPath = config.general.downloadPath + '\\';
      }else{
        //Linux & MacOS Path
        finalPath = config.general.downloadPath + '/';
      }
    }

    fs.writeFile(finalPath + file.filename, file.buffer, function(err){
      if(err){
        addAlert('No se ha podido descargar el archivo', 'alert-red');
      }else{
        addAlert('Descarga completada', 'alert-green');
      }
    })
  });

  socket.on('getUsersResponse', function(online){
    $('#panel-user').html(''); //Limpiar el panel antes de añadir usuarios a la lista para evitar stackear duplicados
    online.forEach(el => {
      var user = $('<span>').text(el.username).addClass('username');
      var time = $('<span>').text(parseTime(el.time)).addClass('time');
      var userBg = $('<div>').append(user).append(time).addClass('user-bg');
      $('#panel-user').append(userBg);
    });
  });

  socket.on('removeMessageResponse', function(messageId){
    var element = $('span[messageid="' + messageId + '"]');
    var elementParent = element.parent('li');
    var elementTime = elementParent.prev();
    var elementUser = elementTime.prev();
    var countChildren = elementParent.children().length - 1;

    element.remove();

    if(countChildren == 0){
      elementParent.remove();
      elementTime.remove();
      elementUser.remove();
    }
  });

  socket.on('editMessageResponse', function(data){
    var element = $('span[messageid="' + data.messageId + '"]');
    element.text(data.newMsg);
    scrollToBottom();
  });

  socket.on('updateColorResponse', function(data){
    if(config.general.updateColors){
      updateUsernameColor(data.color, data.userId);
    }
  });
}

//Document Events
$(document).ready(function() {
  if(config.general.firstRun){
    config.general.firstRun
    $('#firstConfigWindow').show();
  }else{
    $('#usernameTextBox').focus();
  }

  $(document).on('click', '.fileMsg', function(){
    var hash = $(this).attr('id');
    addAlert('La descarga se ha iniciado', 'alert-blue');
    socket.emit('downloadFile', {'hash': hash});
  });

  $('#close-alert-restart').on('click', function(){
    $('#alert-restart').hide();
  });

  $('#restartAppBtn').on('click', function(){
    relaunchApp();
  });

  $('#btnSaveFirstRun').on('click', function(){
    var allOk = [];
    if($('#fRunhostIpInput').val().trim() != ''){
      allOk.push(true);
      config.connection.host = $('#fRunhostIpInput').val().trim();
    }else{
      allOk.push(false);
      addAlert('El campo "Host IP" no puede estar vacío', 'alert-red');
    }

    if($('#fRunportInput').val().trim() != ''){
      allOk.push(true);
      config.connection.port = $('#fRunportInput').val().trim();
    }else{
      allOk.push(false);
      addAlert('El campo "Puerto" no puede estar vacío', 'alert-red');
    }

    config.connection.reconnect = $('#switch-2 > input').prop('checked');

    if(!allOk.includes(false)){
      $('#btnSaveFirstRun').text('Reiniciando pChat...');
      config.general.firstRun = false;
      dumpConfig(true);
      setTimeout(function(){
        relaunchApp();
      }, 800);
    }
  });

  $('#selectDownloadPath').on('change', function(){
    var path = $('#selectDownloadPath').prop('files')[0].path;
    $('#downloadPathInput').val(path);
  });

  $('#selectIconPath').on('change', function(){
    var path = $('#selectIconPath').prop('files')[0].path;
    $('#iconPathInput').val(path);
  });

  $('#configIcon').on('click', function(){
    loadConfig();
    openConfiguration();
  });

  $('#panel-network-btn').on('click', function(){
    networkPanelLoad();
    $('.panel').hide();
    $('#panel-network').show();
  });

  $('#panel-settings-btn').on('click', function(){
    generalPanelLoad();
    $('.panel').hide();
    $('#panel-settings').show();
  });

  $('#panel-user-btn').on('click', function(){
    userPanelLoad();
    $('.panel').hide();
    $('#panel-user').show();
  });

  $('#switch-1 > .slider').on('click', function(){
    config.connection.reconnect = !config.connection.reconnect;
  });

  $('#switch-3 > .slider').on('click', function(){
    config.general.updateColors = !config.general.updateColors;
  });

  $('#switch-4 > .slider').on('click', function(){
    config.general.showCountMessages = !config.general.showCountMessages;
  });

  $('#switch-5 > .slider').on('click', function(){
    config.general.showNotifications = !config.general.showNotifications;
  });
  
  $('.color').on('click', function(){
    $('.color').css('box-shadow', 'none');
    $(this).css({'background': 'white !important', 'box-shadow': hexToRgb($(this).attr('data-color'), 0.3) + ' 0px 0px 0px 4px'});
    userColorSelectedTmp = $(this).attr('data-color');
  })

  $('#btnSaveNetwork').on('click', function(){
    var completeSave = true;

    if($('#hostIpInput').val().trim() != ''){
      config.connection.host = $('#hostIpInput').val().trim();
    }else{
      completeSave = false;
    }

    if($('#portInput').val().trim() != ''){
      config.connection.port = $('#portInput').val().trim();
    }else{
      completeSave = false;
    }

    if(completeSave){
      dumpConfig(true);
    }else{
      addAlert('Los campos de texto no pueden estar vacíos', 'alert-red');
    }
  });

  $('#btnSaveGeneral').on('click', function(){
    var restart = false;
    var completeSave = true;

    if($('#downloadPathInput').val().trim() != ''){
      config.general.downloadPath = $('#downloadPathInput').val().trim();
    }else{
      completeSave = false;
    }

    if(userColorSelectedTmp != config.general.userColor){
      config.general.userColor = userColorSelectedTmp;
      socket.emit('updateColor', {color: config.general.userColor, userId: socket.id});
    }

    if($('#minimizeShortcut').val().trim() != ''){
      if($('#minimizeShortcut').val().trim() != config.general.trayKey){
        restart = true;
      }

      config.general.trayKey = $('#minimizeShortcut').val();
    }else{
      completeSave = false;
    }

    if($('#notifShortcut').val().trim() != ''){
      if($('#notifShortcut').val().trim() != config.general.notifKey){
        restart = true;
      }

      config.general.notifKey = $('#notifShortcut').val();
    }else{
      completeSave = false;
    }

    if($('#iconPathInput').val().trim() != ''){
      config.general.iconPath = $('#iconPathInput').val().trim();
      if(path.isAbsolute($('#iconPathInput').val().trim())){
        addAlert('La ruta de tu icono es absoluta, es recomendable utilizar rutas dinámicas para evitar errores', 'alert-yellow');
      }
    }else{
      completeSave = false;
    }
    
    if(completeSave){
      dumpConfig(restart);
    }else{
      addAlert('Los campos de texto no pueden estar vacíos', 'alert-red');
    }
  });

  window.onblur = function(){
    winFocus = false;
  }

  window.onfocus = function(){
    winFocus = true;
  }

  window.addEventListener('paste', function(e){
    var buff = e.clipboardData.items[0];
    if (buff.type.split('/')[0] == 'image') {
      var blob = buff.getAsFile();
      var reader = new FileReader();
      reader.onload = function(event){
        var b64Image = event.target.result;
        socket.emit('image', {'image': b64Image, 'color': config.general.userColor, 'usernameId': socket.id});
      };
      reader.readAsDataURL(blob);
    }
  }, false);

  $('#chat').on('dragover', function (e) {
    e.stopPropagation();
    e.preventDefault();
    return true;
  });

  $('#chat').on('drop', function(e){
    e.preventDefault();
    e.stopPropagation();

    for(let f of e.originalEvent.dataTransfer.files) {
      var type = f.type.split('/');
      if(socket.connected && type[0] == 'image'){
        socket.emit('image', {'image': base64Encode(f.path), 'color': config.general.userColor, 'usernameId': socket.id});
      }else{
        if(socket.connected){
          if(f.size / 1024 / 1024 <= 20){
            if(f.name.length <= 138){
              fs.readFile(f.path, function(err, data){
                if(err){
                  addAlert('No se ha podido procesar tu archivo', 'alert-red');
                }else{
                  socket.emit('file', {'name': f.name, 'buffer': data, 'size': f.size, 'color': config.general.userColor, 'usernameId': socket.id});
                }
              });
            }else{
              addAlert('El nombre de tu archivo es demasiado largo (Max. 138 caracteres)', 'alert-red');
            }
          }else{
            addAlert('El archivo supera el limite de 20MB', 'alert-red');
          }
        }
      }
    }

    return false;
  });

  $('input#usernameTextBox').keyup(function(e){
    if(e.keyCode == 13){
      if($(this).val().trim() != ''){
        $(this).prop('disabled', true);
        if($(this).val().trim().match(/^[a-zA-Z0-9\-_\s]+$/) != null && $(this).val().trim() != 'everyone'){
          username = $(this).val().trim();
          connect();
          addAlert('Estableciendo conexión con el servidor...', 'alert-blue');
          $('input#usernameTextBox').val('');
        }else{
          addAlert('Nombre de usuario no válido', 'alert-yellow');
          $(this).prop('disabled', false);
          $(this).focus();
        }
      }
    }
  });

  $('input#msgSendTextBox').keyup(function(e){
    if(e.keyCode == 13){
      if($(this).val().trim() != '' && socket.connected){
        var content = $('input#msgSendTextBox').val().trim();
        var mentions = getMentions(content);
        socket.emit('message', {'content': content, 'color': config.general.userColor, 'mentions': mentions});
        $('input#msgSendTextBox').val('');
      }
    }

    if(e.keyCode == 38 && $('#chat>ul').children().length != 0 && !isEditing){
      isEditing = true;
      var msgText = $('#chat>ul>li>span[messageid="' + lastMessageIDSended + '"]').text();  
      var editInput = $('<input type="text">').css({'margin': '10px 0px', 'width': '100%'}).val(msgText); //Se crea el input
      $('#chat>ul>li>span[messageid="' + lastMessageIDSended + '"]').html(editInput); //Se reemplaza el texto con el input
      $('input#msgSendTextBox').prop('disabled', true); //Se desactiva el input principal
      editInput.focus();
      scrollToBottom();

      editInput.keyup(function(e){
        if(e.keyCode == 13){
          var newInputText = editInput.val();
          socket.emit('editMessage', {'messageId': lastMessageIDSended, 'newMsg': newInputText});
          $('input#msgSendTextBox').prop('disabled', false);
          $('input#msgSendTextBox').focus();
          isEditing = false;
        }
      });
    }
  });

  function getMentions(message){
    var pattern = /\B<@[a-zA-Z0-9_-\s]+>/gi;
    return message.match(pattern);
  }

  $('#close-btn').on('click', function() {
    try{
      if(socket.connected){
        socket.disconnect();
      }
    }finally{
      var window = remote.getCurrentWindow();
      window.close();
    }
  });

  $('#min-btn').on('click', function() {
    var window = remote.getCurrentWindow();
    window.minimize();
  });

  $('#max-btn').on('click', function() {
    var window = remote.getCurrentWindow();
    if (!window.isMaximized()) {
      window.maximize();
    } else {
      window.unmaximize();
    }
  });
});

$(document).on('keypress', function(){
  if(mainWindowState){
    $('#msgSendTextBox').focus();
  }
});

$(window).focus(function() {
  unreaded = 0;
  ipcRenderer.sendSync('update-badge', null);
});
