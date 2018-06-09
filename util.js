const crypto = require('crypto')

exports.generateRpcReqId = () => {
    return crypto.randomBytes(4).toString('hex')
}

exports.get_tdlib_message_id = (msg_id) => {
    return parseInt(msg_id) << 20
}

exports.get_api_message_id = (msg_id) => {
    let result = parseInt(msg_id) >> 20
    if (result >> 20 === msg_id) return result
    else return -1
}

exports.parseReplyMarkup = (replymarkup) => {
    if ('inline_keyboard' in replymarkup) {
        let keyboard = {
            '@type': 'replyMarkupInlineKeyboard',
            rows: []
        }
        for (let r of replymarkup.inline_keyboard) {
            let colc = []
            for (let c of replymarkup.inline_keyboard) {
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
                        data: Buffer.from(c.data, 'utf8').toString('base64')
                    }
                } else if ('switch_inline_query' in c) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeSwitchInline',
                        in_current_chat: false
                    }
                } else if ('switch_inline_query_current_chat' in c) {
                    col.type = {
                        '@type': 'inlineKeyboardButtonTypeSwitchInline',
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
        for (let r of replymarkup.inline_keyboard) {
            let colc = []
            for (let c of replymarkup.inline_keyboard) {
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
