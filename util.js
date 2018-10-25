const crypto = require('crypto')
const os = require('os')
const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')

exports.generateRpcReqId = () => crypto.randomBytes(4).toString('hex')

exports.generateTempFileLocation = (instance_name = 'unknown') => path.join(os.tmpdir(), `tdlib-${instance_name.toString().normalize()}-${crypto.randomBytes(5).toString('hex')}`)

exports.get_tdlib_message_id = (msg_id) => {
    return parseInt(msg_id) * Math.pow(2, 20)
}

exports.get_api_message_id = (msg_id) => {
    let result = parseInt(msg_id) / Math.pow(2, 20)
    if (result * Math.pow(2, 20) === parseInt(msg_id)) return result
    else throw new Error('Wrong message id.')
}

exports.scrypt = (password, salt, keylen) => new Promise((rs, rj) => crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
    if (err) rj(err)
    else rs(derivedKey) 
}))

exports.fileExists = async (_path, mode = fs.constants.F_OK) => {
    try {
        await fsp.access(path.resolve(_path), mode)
        return true
    } catch (e) {
        return false
    }
}

exports.fileExistsSync = (_path, mode = fs.constants.F_OK) => {
    try {
        fs.accessSync(path.resolve(_path), mode)
        return true
    } catch (e) {
        return false
    }
}



