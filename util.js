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

exports.parseReplyMarkup = (replymarkup, encrypt_callback_query = false) => {
    if ('inline_keyboard' in replymarkup) {
        let keyboard = {
            '@type': 'replyMarkupInlineKeyboard',
            rows: []
        }
        for (let r of replymarkup.inline_keyboard) {
            let colc = []
            for (let c of r) {
                let col = {
                    '@type': 'inlineKeyboardButton',
                    text: c.text
                }
                if ('url' in c) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeUrl',
                        url: c.url
                    }
                } else if ('callback_data' in c) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeCallback',
                    }
                    if (encrypt_callback_query) {
                        let encryptor = crypto.createCipheriv('aes-256-cfb', encrypt_callback_query, '0000000000000000')
                        col.type.data = Buffer.concat([Buffer.from('0f0f', 'hex'), encryptor.update(Buffer.from(c.callback_data, 'utf8')), encryptor.final()]).toString('base64')
                    } else {
                        col.type.data = Buffer.from(c.callback_data, 'utf8').toString('base64')
                    }
                } else if ('switch_inline_query' in c) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeSwitchInline',
                        query: c.switch_inline_query,
                        in_current_chat: false
                    }
                } else if ('switch_inline_query_current_chat' in c) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeSwitchInline',
                        query: c.switch_inline_query_current_chat,
                        in_current_chat: true
                    }
                } else if ('callback_game' in c) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeCallbackGame',
                    }
                } else if (c.pay) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeBuy'
                    }
                }
                colc.push(col)
            }
            keyboard.rows.push(colc)
        }
        return keyboard
    } else if ('keyboard' in replymarkup) {
        let keyboard = {
            '@type': 'replyMarkupShowKeyboard',
            rows: [],
            resize_keyboard: replymarkup.resize_keyboard,
            one_time: replymarkup.one_time_keyboard,
            is_personal: replymarkup.selective
        }
        for (let r of replymarkup.keyboard) {
            let colc = []
            for (let c of r) {
                let col = {
                    '@type': 'keyboardButton',
                    text: c.text
                }
                if (c.request_contact) {
                    col.type = {
                        '@type': 'keyboardButtonTypeRequestPhoneNumber',
                    }
                } else if (c.request_location) {
                    col.type = {
                        '@type': 'keyboardButtonTypeRequestLocation'
                    }
                } else {
                    col.type = {
                        '@type': 'keyboardButtonTypeText'
                    }
                }
                colc.push(col)
            }
            keyboard.rows.push(colc)
        }
        return keyboard
    } else if (replymarkup.remove_keyboard) {
        let keyboard = {
            '@type': 'replyMarkupRemoveKeyboard',
            is_personal: replymarkup.selective
        }
        return keyboard
    } else if (replymarkup.force_reply) {
        let keyboard = {
            '@type': 'replyMarkupForceReply',
            is_personal: replymarkup.selective
        }
        return keyboard
    }
}


