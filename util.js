const crypto = require('crypto')

exports.generateRpcReqId = () => {
    return crypto.randomBytes(4).toString('hex')
}
