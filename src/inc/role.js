const vars = require('./vars')

module.exports = class Role{
  constructor(name){
    this._id = ''
    this.name = name
    this.perm = []
  }
}
