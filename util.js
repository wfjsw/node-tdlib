const crypto = require('crypto')

/*
const entities_mirror_table = new Map([
    ['textEntityTypeBold', 'bold'],
    ['textEntityTypeBotCommand', 'bot_command'],
    ['textEntityTypeCashtag', 'cashtag'],
    ['textEntityTypeCode', 'code']
    ['textEntityTypeEmailAddress', 'email'],
    ['textEntityTypeHashtag', 'hashtag']

])
*/

exports.generateRpcReqId = () => {
    return crypto.randomBytes(4).toString('hex')
}

exports.get_tdlib_message_id = (msg_id) => {
    return parseInt(msg_id) << 20
}

exports.get_api_message_id = (msg_id) => {
    let result = parseInt(msg_id) >> 20
    if ((result << 20) === parseInt(msg_id)) return result
    else throw new Error('Wrong message id.')
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
                for (let {
                        command,
                        description
                    } of full.bot_info.commands) {
                    bot_user.bot_options.commands.push({
                        command,
                        description
                    })
                }
            }
        }
    }

    return bot_user
}


exports.buildBotApiChat = (chat, additional, additional_full, sticker, pin_msg) => {
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
    if (chat.type['@type'] == 'chatTypeSupergroup') {
        if (chat.type.is_channel) {
            bot_chat.type = 'channel'
            bot_chat.sign_messages = additional.sign_messages
        } else {
            bot_chat.type = 'supergroup'
            bot_chat.anyone_can_invite = exports.anyone_can_invite
        }
        bot_chat.username = additional.username
        bot_chat.date = additional.date
        bot_chat.status = exports.getStatus(additional.status)
        bot_chat.member_count = additional.member_count
        bot_chat.is_verified = additional.is_verified
        bot_chat.restriction_reason = additional.restriction_reason
        if (additional_full) {
            bot_chat.administrator_count = additional_full.administrator_count
            bot_chat.restricted_count = additional_full.restricted_count
            bot_chat.banned_count = additional_full.banned_count
            bot_chat.can_get_members = additional_full.can_get_members
            bot_chat.can_set_username = additional_full.can_set_username
            bot_chat.can_set_sticker_set = additional_full.can_set_sticker_set
            bot_chat.is_all_history_available = additional_full.is_all_history_available
            if (!isNaN(additional_full.migrate_from_chat_id))
                bot_chat.migrate_from_chat_id = -additional_full.upgraded_from_basic_group_id
        }
        if (sticker) {
            bot_chat.sticker_set_name = sticker.name
        }
        if (pin_msg)
            bot_chat.pinned_message = pin_msg
    } else if (chat.type['@type'] == 'chatTypeBasicGroup') {
        bot_chat.type = 'group'
        bot_chat.all_members_are_administrators = additional.everyone_is_administrator
        bot_chat.is_active = additional.is_active
        bot_chat.creator = additional_full.creator_user_id
    } else if (chat.type['@type'] == 'chatTypePrivate') {
        bot_chat.type = 'private'
        bot_chat = Object.assign(bot_chat, exports.buildBotApiUser(additional, additional_full))
    } else {
        throw new Error('Unknown Chat Type.')
    }
    return bot_chat
}

exports.buildBotApiMessage = (message, chat, from, reply_msg, forward_info) => {
    let bot_message = {
        message_id: exports.get_api_message_id(message.id),
        date: message.date,
        edit_date: message.edit_date,
        is_channel_post: message.is_channel_post,
        can_be_deleted_for_all_users: message.can_be_deleted_for_all_users,
    }
    if (chat)
        bot_message.chat = chat
    if (from)
        bot_message.from = from
    if (reply_msg)
        bot_message.reply_to_message = reply_msg
    if (message.reply_to_message_id)
        bot_message.reply_to_message_id = exports.get_api_message_id(message.reply_to_message_id)
    if (message.media_group_id)
        bot_message.media_group_id = message.media_group_id
    if ('views' in message)
        bot_message.views = message.views
    if (message.forward_info)
        switch (message.forward_info['@type']) {
            case 'messageForwardedFromUser':
                bot_message.forward_from = forward_info
                bot_message.forward_date = message.forward_info.date
                break
            case 'messageForwardedPost':
                bot_message.forward_from_chat = forward_info
                bot_message.forward_from_message_id = exports.get_api_message_id(message.forward_info.message_id)
                bot_message.forward_date = message.forward_info.date
                bot_message.forward_signature = message.forward_info.author_signature
                break
        }
    switch (message.content['@type']) {
        case 'messageText':
            bot_message.text = message.content.text.text
            // Before solving the mentioned issue, ignore entities for a while.
            break
            //case ''
    }
    return bot_message
}

/* TODO: Solve the problem of passing mentioned user object.
exports.buildBotApiEntities = (entities) => {
    let _entities = entities.map((entity) => {
        return {
            offset: entity.offset,
            length: entity.length
        }
    })
}

*/

exports.getStatus = (chatMemberStatus) => {
    switch (chatMemberStatus['@type']) {
        case 'chatMemberStatusCreator':
            delete chatMemberStatus['@type']
            delete chatMemberStatus['@extra']
            return Object.assign(chatMemberStatus, {
                status: 'creator'
            })
        case 'chatMemberStatusAdministrator':
            delete chatMemberStatus['@type']
            delete chatMemberStatus['@extra']
            return Object.assign(chatMemberStatus, {
                status: 'administrator'
            })
        case 'chatMemberStatusMember':
            delete chatMemberStatus['@type']
            delete chatMemberStatus['@extra']
            return Object.assign(chatMemberStatus, {
                status: 'member'
            })
        case 'chatMemberStatusRestricted':
            delete chatMemberStatus['@type']
            delete chatMemberStatus['@extra']
            return Object.assign(chatMemberStatus, {
                status: 'restricted',
                until_date: chatMemberStatus.restricted_until_date
            })
        case 'chatMemberStatusLeft':
            delete chatMemberStatus['@type']
            delete chatMemberStatus['@extra']
            return Object.assign(chatMemberStatus, {
                status: 'left'
            })
        case 'chatMemberStatusBBanned':
            delete chatMemberStatus['@type']
            delete chatMemberStatus['@extra']
            return Object.assign(chatMemberStatus, {
                status: 'kicked',
                until_date: chatMemberStatus.banned_until_date
            })
    }
}
