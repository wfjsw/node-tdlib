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

exports.buildBotApiUser = (user, full) => {
    let bot_user = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        restriction_reason: user.restriction_reason,
        is_verified: user.is_verified,
        phone_number: user.phone_number,
        is_bot: false
    }
    if (user.profile_photo) {
        bot_user.photo = {
            small_file_id: user.profile_photo.small.remote.id,
            big_file_id: user.profile_photo.big.remote.id
        }
    }
    switch (user.status['@type']) {
        /* -5: long time ago
         * -4: last month
         * -3: last week
         * -2: recently
         * -1: currently online
         * 0 - max_int: last seen on timestamp
         */
        case 'userStatusEmpty':
            bot_user.last_seen = -5
            break
        case 'userStatusLastMonth':
            bot_user.last_seen = -4
            break
        case 'userStatusLastWeek':
            bot_user.last_seen = -3
            break
        case 'userStatusRecently':
            bot_user.last_seen = -2
            break
        case 'userStatusOnline':
            bot_user.last_seen = -1
            break
        case 'userStatusOffline':
            bot_user.last_seen = user.status.was_online
            break
    }

    switch (user.type['@type']) {
        case 'userTypeBot':
            bot_user.is_bot = true
            bot_user.type = 'bot'
            bot_user.bot_options = {
                can_join_groups: user.type.can_join_groups,
                can_read_all_group_messages: user.type.can_read_all_group_messages,
                is_inline: user.type.is_inline,
                inline_query_placeholder: user.type.inline_query_placeholder,
                need_location: user.type.need_location
            }
            break
        case 'userTypeDeleted':
            bot_user.type = 'deleted'
            break
        case 'userTypeRegular':
            bot_user.type = 'user'
            break
        case 'userTypeUnknown':
            // No information on the user besides the user_id is available, yet this user has not been deleted. This object is extremely rare and must be handled like a deleted user. It is not possible to perform any actions on users of this type.
            bot_user.type = 'deleted'
            break
    }

    if (full) {
        bot_user.description = full.bio
        bot_user.group_in_common_count = full.group_in_common_count
        if (full.bot_info) {
            bot_user.bot_options.description = full.bot_info.description
            if (full.bot_info.commands) {
                bot_user.bot_options.commands = []
                for (let { command, description } of full.bot_info.commands) {
                    bot_user.bot_options.commands.push({command, description})
                }
            }
        }
    }

    return bot_user
}


exports.buildBotApiChat = (chat, additional, additional_full) => {
    let bot_chat = {
        id: chat.id,
        title: chat.title

    }
    if (chat.photo) {
        bot_chat.photo = {
            small_file_id: chat.photo.small.remote.id,
            big_file_id: chat.photo.big.remote.id
        }
    }
}
