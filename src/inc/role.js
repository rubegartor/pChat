const vars = require('./vars')

module.exports = class Role{
  constructor(name){
    this._id = ''
    this.topRole = false
    this.position = 0
    this.name = name
    this.perm = []
  }
}
