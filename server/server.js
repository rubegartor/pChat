const server = require('http').createServer()
const io = require('socket.io')(server)
const fs = require('fs')
const crypto = require('crypto')
const minimist = require('minimist')
const createDOMPurify = require('dompurify')
const { JSDOM } = require('jsdom')
var striptags = require('striptags')

argv = minimist(process.argv.slice(2))
port = 1234
userList = [] //Lista de nicknames conectados
users = {} //Diccionario por key(user.id) conectados
files = {} //Diccionario para almacenar las ids de los archivos junto al nombre del archivo

const window = (new JSDOM('')).window
const DOMPurify = createDOMPurify(window)

function Image(username, userColor, usernameId, b64Image, hash){
  this.username = username
  this.userColor = userColor
  this.usernameId = usernameId
  this.b64Image = b64Image
  this.hash = hash
}

function Message(username, userColor, usernameId, content, hash, mentions){
  this.username = username
  this.userColor = userColor
  this.usernameId = usernameId
  this.content = content
  this.hash = hash
}

function FileResponse(username, userColor, filename, hash, size, usernameId){
  this.username = username
  this.userColor = userColor
  this.filename = filename
  this.hash = hash
  this.size = size
  this.usernameId = usernameId
}

function File(filename, buffer, extension){
  this.filename = filename
  this.buffer = buffer
  this.extension = extension
}

function sha1(string) {
  return crypto.createHash('sha1').update(string, 'binary').digest('hex')
}

io.on('connection', function(client) {
  console.log('User connected (' + client.id + ')')
  client.on('checkUsername', function(username){
    var filtered = userList.filter(function(el){
      return el.username === username //Devuelve el objeto que coincida
    })

    if(filtered.length == 0){
      io.to(client.id).emit('checkUserResponse', false)
    }else{
      io.to(client.id).emit('checkUserResponse', true)
    }
  })

  client.on('newUsername', function(username){
    users[client.id] = {'username': username}
    userList.push({'id': client.id,'username': username, 'time': new Date()})
    io.emit('userConnected', username)
    io.emit('getUsersResponse', userList)
  })

  client.on('message', function(message){
    var messageHash = sha1(new Date().getTime() + users[client.id]['username'])

    var finalMessage = DOMPurify.sanitize(striptags(message.content, ['u', 'i', 'b']))
    var haveText = DOMPurify.sanitize(striptags(message.content)).length

    if(finalMessage.trim().length > 0 && haveText > 0){
      io.emit('messageResponse', new Message(users[client.id]['username'], message.color, client.id, finalMessage, messageHash))
    }
  })

  client.on('image', function(image){
    var imageHash = sha1(new Date().getTime() + users[client.id]['username'])
    io.emit('imageResponse', new Image(users[client.id]['username'], image.color, client.id, image, imageHash))
  })

  client.on('file', function(file){
    var fileHash = sha1(new Date().getTime() + file.name)
    var extension = file.name.split('.')[1]
    files[fileHash] = {'name': file.name, 'userId': client.id, 'extension': extension}

    if (!fs.existsSync('./uploads/')){
      fs.mkdirSync('./uploads/')
    }

    fs.writeFile('./uploads/' + fileHash + '.' + extension, file.buffer, function(err){
      if(err){
        console.log(err)
      }else{
        io.emit('fileResponse', new FileResponse(users[client.id]['username'], file.color, file.name, fileHash, file.size, client.id))
      }
    })
  })

  client.on('downloadFile', function(data){
    fs.readFile('./uploads/' + data.hash + '.' + files[data.hash].extension, function(err, buffer){
      if(err){
        console.log(err)
      }else{
        io.to(client.id).emit('downloadResponse', new File(files[data.hash].name, buffer, files[data.hash].extension))
      }
    })
  })

  client.on('getUsers', function(){
    io.emit('getUsersResponse', userList)
  })

  client.on('removeMessage', function(messageId){
    io.emit('removeMessageResponse', messageId)
  })

  client.on('removeImage', function(imageId){
    io.emit('removeImageResponse', imageId)
  })

  client.on('editMessage', function(data){
    var haveText = DOMPurify.sanitize(striptags(data.newMsg)).trim().length

    if(haveText > 0){
      data.newMsg = DOMPurify.sanitize(striptags(data.newMsg, ['u', 'i', 'b']))
      io.emit('editMessageResponse', data)
    }else{
      data.newMsg = data.prevMsg
      io.emit('editMessageResponse', data)
    }
  })

  client.on('updateColor', function(data){
    io.emit('updateColorResponse', data)
  })

  client.on('disconnect', function() {
    console.log('Client disconnected: ', client.id)
    try{
      io.emit('userDisconnected', users[client.id]['username'])
      var filtered = userList.filter(function(el){
        return el.id === client.id //Devuelve el objeto que coincida
      })
      userList.splice(userList.indexOf(filtered[0]), 1)
      delete users[client.id]
      io.emit('getUsersResponse', userList)
    }catch{}
  })

  client.on('error', function (err) {
    console.log('Error from client => ', client.id)
    console.log(err)
  })
})

if(argv['p'] != undefined){
  port = argv['p']
}

server.listen(port, function (err) {
  if (err) throw err
  console.log('Starting server...')
  console.log('Server info => http://0.0.0.0:' + port + '/')
})
