const fs = require('fs')
const process = require('process')
const config = JSON.parse(fs.readFileSync('settings.json', 'utf-8'))
const server = require('https').createServer({
  key: fs.readFileSync(config.certs.serverKey, 'utf-8'),
  cert: fs.readFileSync(config.certs.serverCert, 'utf-8')
})
const io = require('socket.io')(server)
const mongoose = require('mongoose')
const Channel = require('./models/channel')
const Message = require('./models/message')
const Role = require('./models/role')
const User = require('./models/user')
const bcrypt = require('bcryptjs')
const createDOMPurify = require('dompurify')
const { JSDOM } = require('jsdom')
const striptags = require('striptags')

const window = (new JSDOM('')).window
const DOMPurify = createDOMPurify(window)

const userRowsNoSensitive = 'user_id username color roles'

mongoose.connect(config.dbURL, {useNewUrlParser: true}) 
mongoose.Promise = global.Promise
let db = mongoose.connection

db.on('error', () => {
  console.log('[ERROR] Cannot connect to MongoDB server')
  process.exit(1)
})

function getUsers(){
  User.find({}, '-password').exec((err, users) => {
    io.emit('getUsersResponse', users)
  })
}

io.on('connection', (client) => {
  console.log('User connected (' + client.id + ')')

  client.on('loginRequest', (creds) => {
    User.findOne({username: creds.username}).exec((err, user) => {
      if(user != null){
        bcrypt.compare(creds.password, user.password).then((res) => {
          if(res){
            User.findOne({username: creds.username}).populate({path: 'roles'}).exec((err, user) => {
              User.updateOne({username: creds.username}, {$set: {'user_id': client.id}, 'status.main': 'online'}).exec(() => {
                io.to(client.id).emit('loginRequestResponse', {'status': 'ok', 'username': creds.username, 'user_status': user.status, 'roles': user.roles, 'color': user.color})
              })
            })
          }else{
            io.to(client.id).emit('loginRequestResponse', {'status': 'err', message: 'La contraseña no es correcta'})
          }
        })
      }else{
        io.to(client.id).emit('loginRequestResponse', {'status': 'err', message: 'El usuario no existe'})
      }
    })
  })

  client.on('getChannels', () => {
    User.findOne({'user_id': client.id}, '-password').exec((err, user) => {
      Channel.find({requiredRoles: {$in: user.roles}}).exec((err, channels) => {
        io.to(client.id).emit('setChannels', channels)
      })
    })
  })

  client.on('joinChannel', (channel) => {
    Object.keys(client.rooms).forEach((el) => {
      if(el != client.id){
        client.leave(el)
      }
    })
    client.join(channel.name)
  })

  client.on('getChannelMessages', (channel) => {
    Channel.findOne({name: channel}).populate({path: 'messages', options: {limit: 20, sort: {_id: -1}}, populate: {path: 'user', select: userRowsNoSensitive}}).exec((err, item) => {
      io.to(client.id).emit('getChannelMessagesResponse', item)
    })
  })

  client.on('message', (message) => {
    var finalMessage = DOMPurify.sanitize(striptags(message.content, ['u', 'i', 'b']))
    var haveText = DOMPurify.sanitize(striptags(message.content)).length

    User.findOne({username: message.user.username}, '-password', (err, user) => {
      var msg = new Message({
        _id: new mongoose.mongo.ObjectId(),
        user: user._id,
        content: finalMessage,
        time: message.time,
        channel: message.channel,
        state: message.state,
        file: message.file,
        image: message.image
      })

      msg.save().then((msg) => {
        Channel.updateOne({name: message.channel}, {$push: {messages: msg._id}}).exec()
  
        if((finalMessage.trim().length > 0 && haveText > 0) || msg.image != null){
          Message.findOne({_id: msg._id}).populate('user', userRowsNoSensitive).exec((err, toSendMessage) => {
            io.in(msg.channel).emit('messageResponse', toSendMessage)
          })
        }
      })
    })
  })

  client.on('removeMessage', (message) => {
    User.findOne({'user_id': client.id}, '-password').populate({path: 'roles'}).exec((err, user) => {
      Message.findOne({_id: message._id}).populate('user', 'username').exec((err, msg) => {
        var removeMessagesPerm = false

        if(user.username != msg.user.username){ //Si el mensaje pertenece al usuario que ha solicitado la eliminación del mismo, se eliminará independientemente de sus permisos
          for(role of user.roles){
            if(role.permissions.removeMessages){
              removeMessagesPerm = true
              break
            }
          }
        }else{
          removeMessagesPerm = true
        }
  
        if(removeMessagesPerm){
          Message.deleteOne({_id: message._id}).exec()
  
          io.emit('removeMessageResponse', {'status': 'ok', 'data': message})
        }else{
          io.to(client.id).emit('removeMessageResponse', {'status': 'err', 'message': 'No tienes permisos para realizar esta acción'})
        }
      })
    })
  })

  client.on('createChannel', (channel) => {
    Channel.findOne({name: channel.name}).exec((err, item) => {
      if(item == null){
        Role.find({name: {$in: channel.requiredRoles}}).exec((err, roles) => {
          if(roles != null){
            var rolesIDs = roles.map(function getRoleID(role) {
              return role._id
            })

            var chn = new Channel({
              _id: new mongoose.mongo.ObjectId(),
              name: channel.name,
              position: channel.position,
              messages: [],
              requiredRoles: rolesIDs
            })
        
            chn.save((err) => {
              if(err){
                return console.error(err)
              }else{
                //Se envia la creación del canal solo a los usuarios que tengan los roles asignados con los que se ha creado el canal
                User.find({roles: {$in: rolesIDs}}, '-password').exec((err, users) => {
                  users.forEach((user) => {
                    io.to(user.user_id).emit('createChannelResponse', {'status': 'ok', 'data': channel})
                  })
                })
              }
            })
          }
        })
      }else{
        io.emit('createChannelResponse', {'status': 'err', 'msg': 'El canal ya existe'})
      }
    })
  })

  client.on('removeChannel', (channel) => {
    Channel.deleteOne({name: channel.name}).exec()
    io.emit('removeChannelResponse', channel)
  })

  client.on('editChannel', (data) => {
    Channel.findOne({name: '#' + data.newChannel.name}).exec((err, item) => {
      if(item == null){
        data.status = 'ok'
        data.toEdit = '#' + data.toEdit
        data.newChannel.name = '#' + data.newChannel.name
      }else{
        data.status = 'err'
      }

      Channel.updateOne({name: data.toEdit}, {$set: {'name': data.newChannel.name}}).exec(() => {
        io.emit('editChannelResponse', data)
      })
    })
  })

  client.on('getUsers', () => {
    getUsers()
  })

  client.on('updateUsernameStatus', (user) => {
    User.updateOne({user_id: client.id}, {$set: {'status': user.status}}).exec(() => {
      getUsers()
    })
  })

  client.on('updateUsernameColor', (data) => {
    User.updateOne({user_id: client.id}, {$set: {'color': data.newColor}}).exec(() => {
      io.emit('updateUsernameColorResponse', data)
    })
  })

  client.on('addRole', (data) => {
    User.findOne({user_id: client.id}, '-password').populate({path: 'roles'}).exec((err, user) => {
      var updateRolesPerm = false
      for(role of user.roles){
        if(role.permissions.updateRoles){
          updateRolesPerm = true
          break
        }
      }

      if(updateRolesPerm){
        Role.findOne({name: data.role.name}).exec((err, rl) => {
          if(rl != null){
            User.findOne({'user_id': data.user.user_id}, '-password').exec((err, userRoleData) => {
              if(!userRoleData.roles.includes(rl._id)){ //Se comprueba si el usuario ya tiene el rol para no duplicarlo
                User.updateOne({'user_id': data.user.user_id}, {$push: {roles: rl._id}}).exec(() => {
                  io.to(data.user.user_id).emit('updateRoles', {'status': 'ok', 'data': {action: 'add', role: rl}})
                })
              }
            })
          }
        })
      }else{
        io.to(client.id).emit('updateRoles', {'status': 'err', 'message': 'No tienes permisos para realizar esta acción'})
      }
    })
  })

  client.on('removeRole', (data) => {
    User.findOne({user_id: client.id}, '-password').populate({path: 'roles'}).exec((err, user) => {
      var updateRolesPerm = false
      for(role of user.roles){
        if(role.permissions.updateRoles){
          updateRolesPerm = true
          break
        }
      }

      if(updateRolesPerm){
        Role.findOne({name: data.role.name}).exec((err, rl) => {
          if(rl != null){
            User.updateOne({'user_id': data.user.user_id}, {$pull: {'roles': rl._id }}).exec(() => {
              io.to(data.user.user_id).emit('updateRoles', {'status': 'ok', 'data': {action: 'remove', role: rl}})
            })
          }
        })
      }else{
        io.to(client.id).emit('updateRoles', {'status': 'err', 'message': 'No tienes permisos para realizar esta acción'})
      }
    })
  })

  client.on('searchMessages', (data) => {
    if(data.message.length > 0){
      User.findOne({username: data.user.username}, '-password').exec((err, user) => {
        Message.find({user: user._id, channel: data.channel, content: {$regex : '.*' + data.message + '.*'}}).exec((err, messages) => {
          io.to(client.id).emit('searchMessagesResponse', messages)
        })
      })
    }
  })

  client.on('disconnect', () => {
    User.updateOne({user_id: client.id}, {$set: {'status.main': 'offline'}}).exec(() => {
      getUsers()
    })
    console.log('Client disconnected: ', client.id)
  })

  client.on('error', (err) => {
    console.log('Error from client => ', client.id)
    console.log(err)
  })
})

server.listen(config.port, (err) => {
  if (err) throw err
  console.log('Starting server...\nServer info => https://0.0.0.0:' + config.port + '/')
})

process.on('uncaughtException', function (err) {
  fs.appendFile('server.log', '\n' + err.stack, encoding='utf-8', function (err) {
    console.log('[INFO] Error Logged!');
  })
})
