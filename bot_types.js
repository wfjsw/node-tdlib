const _util = require('./util')

const maskpoint_mirror_table = new Map([
    ['maskPointChin', 'chin'],
    ['maskPointEyes', 'eyes'],
    ['maskPointForehead', 'forehead'],
    ['maskPointMouth', 'mouth']
])

const maskpoint_mirror_table_reversed = new Map([
    ['chin', 'maskPointChin'],
    ['eyes', 'maskPointEyes'],
    ['forehead', 'maskPointForehead'],
    ['mouth', 'maskPointMouth']
])

const chat_member_status_mirror_table = new Map([
    ['chatMemberStatusAdministrator', 'administrator'],
    ['chatMemberStatusBanned', 'kicked'],
    ['chatMemberStatusCreator', 'creator'],
    ['chatMemberStatusLeft', 'left'],
    ['chatMemberStatusMember', 'member'],
    ['chatMemberStatusRestricted', 'restricted']
])


const chataction_mirror_table = new Map([
    ['typing', 'chatActionTyping'],
    ['upload_photo', 'chatActionUploadingPhoto'],
    ['record_video', 'chatActionRecordingVideo'],
    ['upload_video', 'chatActionUploadingVideo'],
    ['record_audio', 'chatActionRecordingVoiceNote'],
    ['upload_audio', 'chatActionRecordingVoiceNote'],
    ['upload_document', 'chatActionUploadingDocument'],
    ['find_location', 'chatActionChoosingLocation'],
    ['record_video_note', 'chatActionRecordingVideoNote'],
    ['upload_video_note', 'chatActionUploadingVideoNote'],
    ['find_contact', 'chatActionChoosingContact'], 
    ['play_game', 'chatActionStartPlayingGame']
])

class BotTypeConversion {
    /**
     * @param {TdClientActor.TdClientActor} TdClient 
     */
    constructor(TdClient) {
        if (!TdClient) throw new Error('You have to pass a functional TdClient for this to work.')
        this.client = TdClient
    }
    
    /**
     * @param {TdTypes.user} user
     * @returns {Promise<BotAPITypes.User & BotAPITypes$Extended.User>}
     */
    async buildUser(user, out_full = false) {
        /** @type {BotAPITypes.User & BotAPITypes$Extended.User} */
        let bot_user = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
            restriction_reason: user.restriction_reason,
            is_verified: user.is_verified,
            phone_number: user.phone_number,
            is_bot: false,
            last_seen: null,
            type: null
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


        if (out_full) {
            let full = await this.client.run('getUserFullInfo', {
                user_id: user.id
            })
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


    async buildChat(chat, out_full = false) {
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
            let additional = await this.client.run('getSupergroup', {
                supergroup_id: chat.type.supergroup_id
            })
            if (chat.type.is_channel) {
                bot_chat.type = 'channel'
                bot_chat.sign_messages = additional.sign_messages
            } else {
                bot_chat.type = 'supergroup'
                bot_chat.anyone_can_invite = additional.anyone_can_invite
            }
            bot_chat.username = additional.username
            bot_chat.date = additional.date
            bot_chat.status = await this.buildChatMember(additional.status)
            bot_chat.member_count = additional.member_count // This is not reliable. Use another approach.
            bot_chat.is_verified = additional.is_verified
            bot_chat.restriction_reason = additional.restriction_reason
            if (out_full) {
                try {
                    let additional_full = await this.client.run('getSupergroupFullInfo', {
                        supergroup_id: chat.type.supergroup_id
                    })

                    // Issue: https://github.com/tdlib/td/issues/289#issuecomment-397820646
                    // Bot can't receive a message, which isn't accessible due to bots privacy settings even through getChatPinnedMessage. The only exception is for replied messages, which can be received through getRepliedMessage.
                    // So we will just try. If it failed, we ignore it.
                    // In the future, we will read the privacy settings from the bot's profile.
                    try { 
                        if (additional_full.pinned_message_id) {
                            let pin_msg_orig = await this.client.run('getChatPinnedMessage', {
                                chat_id: chat.id
                            })
                            bot_chat.pinned_message = await this.buildMessage(pin_msg_orig, 1)
                        }
                    } catch (e) {
                        // failed to get the pinned msg
                    } 

                    if (additional_full.sticker_set_id && additional_full.sticker_set_id.toString() != '0') {
                        try {
                            let sticker_set = await this.client.run('getStickerSet', {
                                set_id: additional_full.sticker_set_id
                            })
                            bot_chat.sticker_set_name = sticker_set.name
                            bot_chat.sticker_set_id = additional_full.sticker_set_id
                        } catch (e) {
                            console.error('failed to get sticker set', additional_full.sticker_set_id)
                        }
                    }
                    bot_chat.description = additional_full.description
                    if (additional_full.member_count) bot_chat.member_count = additional_full.member_count 
                    bot_chat.administrator_count = additional_full.administrator_count
                    bot_chat.restricted_count = additional_full.restricted_count
                    bot_chat.banned_count = additional_full.banned_count
                    bot_chat.can_get_members = additional_full.can_get_members
                    bot_chat.can_set_username = additional_full.can_set_username
                    bot_chat.can_set_sticker_set = additional_full.can_set_sticker_set
                    bot_chat.is_all_history_available = additional_full.is_all_history_available
                    bot_chat.invite_link = additional_full.invite_link
                    if (!isNaN(additional_full.upgraded_from_basic_group_id))
                        bot_chat.migrate_from_chat_id = -additional_full.upgraded_from_basic_group_id
                } catch (e) {
                    if (e.message !== 'CHANNEL_PRIVATE') console.error(e)
                }
            }
        } else if (chat.type['@type'] == 'chatTypeBasicGroup') {
            let additional = await this.client.run('getBasicGroup', {
                basic_group_id: chat.type.basic_group_id
            })
            bot_chat.type = 'group'
            bot_chat.status = additional.everyone_is_administrator ? { status: 'member' } : await this.buildChatMember(additional.status)
            bot_chat.all_members_are_administrators = additional.everyone_is_administrator
            bot_chat.is_active = additional.is_active
            bot_chat.member_count = additional.member_count
            // bot_chat.upgraded_to_supergroup_id = additional.upgraded_to_supergroup_id 
            if (!isNaN(bot_chat.upgraded_to_supergroup_id)) {
                bot_chat.upgraded_to_supergroup_id = -Math.pow(10, 12) - additional.upgraded_to_supergroup_id
            }
            if (out_full) {
                try {
                    let additional_full = await this.client.run('getBasicGroupFullInfo', {
                        basic_group_id: chat.type.basic_group_id
                    })
                    bot_chat.creator = additional_full.creator_user_id
                    bot_chat.members = additional_full.members
                // members here? really?
                } catch (e) {
                    console.error(e)
                }
            }
        } else if (chat.type['@type'] == 'chatTypePrivate') {
            let additional = await this.client.run('getUser', {
                user_id: chat.type.user_id
            })
            bot_chat.type = 'private'
            bot_chat = Object.assign(bot_chat, await this.buildUser(additional, out_full))
        } else {
            throw new Error('Unknown Chat Type.')
        }
        return bot_chat
    }

    async buildMessage(message, follow_replies_level = 1) {
        let bot_message = {
            message_id: _util.get_api_message_id(message.id),
            date: message.date,
            edit_date: message.edit_date,
            is_channel_post: message.is_channel_post,
            can_be_deleted_for_all_users: message.can_be_deleted_for_all_users,
        }
        let chat = await this.client.run('getChat', {
            chat_id: message.chat_id
        })
        bot_message.chat = await this.buildChat(chat, false)
        if (message.sender_user_id) {
            let from = await this.client.run('getUser', {
                user_id: message.sender_user_id
            })
            bot_message.from = await this.buildUser(from, false)
        }
        if (message.reply_to_message_id) {
            bot_message.reply_to_message_id = _util.get_api_message_id(message.reply_to_message_id)
            if (follow_replies_level > 0) {
                try {
                    let reply_msg = await this.client.run('getRepliedMessage', {
                        chat_id: message.chat_id,
                        message_id: message.id
                    })
                    bot_message.reply_to_message = await this.buildMessage(reply_msg, follow_replies_level - 1)
                } catch (e) {
                    // failed to get replied message. did it got deleted? lets ignore this.
                }
            }
        }
        if (message.media_group_id)
            bot_message.media_group_id = message.media_group_id
        if ('views' in message)
            bot_message.views = message.views
        if (message.via_bot_user_id) {
            bot_message.via_bot_user_id = message.via_bot_user_id
            try {
                let via_bot = await this.client.run('getUser', {
                    user_id: message.via_bot_user_id
                })
                bot_message.via_bot = await this.buildUser(via_bot, false)
            } catch (e) {
                // ignore
            }
        }
        bot_message.author_signature = message.author_signature
        if (message.forward_info)
            switch (message.forward_info['@type']) {
                case 'messageForwardedFromUser': {
                    let fwd_user = await this.client.run('getUser', {
                        user_id: message.forward_info.sender_user_id
                    })
                    bot_message.forward_from = await this.buildUser(fwd_user, false)
                    bot_message.forward_date = message.forward_info.date
                    break
                }
                case 'messageForwardedPost': {
                    let fwd_chat = await this.client.run('getChat', {
                        chat_id: message.forward_info.chat_id
                    })
                    bot_message.forward_from_chat = await this.buildChat(fwd_chat, false)
                    bot_message.forward_from_message_id = _util.get_api_message_id(message.forward_info.message_id)
                    bot_message.forward_date = message.forward_info.date
                    bot_message.forward_signature = message.forward_info.author_signature
                    break
                }
            }
        switch (message.content['@type']) {
            case 'messageText':
                bot_message.text = message.content.text.text
                bot_message.entities = await this.buildEntities(message.content.text.entities)
                break
            case 'messageAudio':
                bot_message.audio = await this.buildAudio(message.content.audio)
                break
            case 'messageDocument':
                bot_message.document = await this.buildDocument(message.content.document)
                break
            case 'messageGame':
                bot_message.game = await this.buildGame(message.content.game)
                break
            case 'messageAnimation':
                bot_message.animation = await this.buildAnimation(message.content.animation)
                bot_message.document = bot_message.animation // Full compatible, original behavior
                break
            case 'messagePhoto':
                bot_message.photo = await this.buildPhoto(message.content.photo)
                break
            case 'messageSticker':
                bot_message.sticker = await this.buildSticker(message.content.sticker)
                break
            case 'messageVideo':
                bot_message.video = await this.buildVideo(message.content.video)
                break
            case 'messageVoiceNote':
                bot_message.voice = await this.buildVoice(message.content.voice_note)
                bot_message.voice.is_listened = message.content.is_listened
                break
            case 'messageVideoNote':
                bot_message.video_note = await this.buildVideoNote(message.content.video_note)
                bot_message.video_note.is_viewed = message.content.is_viewed
                break
            case 'messageContact':
                bot_message.contact = await this.buildContact(message.content.contact)
                break
            case 'messageLocation':
                bot_message.location = await this.buildLocation(message.content.location)
                bot_message.location.live_period = message.content.live_period
                bot_message.location.expires_in = message.content.expires_in
                break
            case 'messageVenue':
                bot_message.venue = await this.buildVenue(message.content.venue)
                break
            case 'messageChatAddMembers': {
                let new_members = []
                for (let uid of message.content.member_user_ids) {
                    let new_member = await this.client.run('getUser', {
                        user_id: uid
                    })
                    new_members.push(await this.buildUser(new_member, false))
                }
                bot_message.new_chat_members = new_members
                bot_message.new_chat_member = new_members[0]
                break
            }
            case 'messageChatJoinByLink':
                bot_message.new_chat_members = [bot_message.from]
                bot_message.new_chat_member = bot_message.from
                break 
            case 'messageChatDeleteMember': {
                let left_member = await this.client.run('getUser', {
                    user_id: message.content.user_id
                })
                bot_message.left_chat_member = await this.buildUser(left_member, false)

                // NOTE: we didn't get this msg when the bot itself got kicked.
                // Instead, we got this:
                // {"@type":"updateSupergroup","supergroup":{"@type":"supergroup","id":***,"username":"","date":0,"status":{"@type":"chatMemberStatusBanned","banned_until_date":0},"member_count":0,"anyone_can_invite":false,"sign_messages":true,"is_channel":false,"is_verified":false,"restriction_reason":""}}
                // ^ got banned
                // {"@type":"updateSupergroup","supergroup":{"@type":"supergroup","id":***,"username":"","date":1529156811,"status":{"@type":"chatMemberStatusLeft"},"member_count":0,"anyone_can_invite":true,"sign_messages":true,"is_channel":false,"is_verified":false,"restriction_reason":""}}
                // ^ got unbanned

                break
            }
            case 'messageChatChangeTitle':
                bot_message.new_chat_title = message.content.title
                break
            case 'messageChatChangePhoto':
                bot_message.new_chat_photo = await this.buildPhoto(message.content.photo)
                break
            case 'messageChatDeletePhoto':
                bot_message.delete_chat_photo = true
                break
            case 'messageBasicGroupChatCreate': {
                let new_created_members = []
                for (let uid of message.content.member_user_ids) {
                    let new_member = await this.client.run('getUser', {
                        user_id: uid
                    })
                    new_created_members.push(await this.buildUser(new_member, false))
                }
                bot_message.new_chat_members = new_created_members
                bot_message.new_chat_member = new_created_members[0]
                bot_message.group_chat_created = true
                break
            }
            case 'messageSupergroupChatCreate':
                if (bot_message.chat.type == 'channel') bot_message.channel_chat_created = true
                else bot_message.supergroup_chat_created = true
                break
            case 'messageChatUpgradeTo':
                bot_message.migrate_to_chat_id = -(message.content.supergroup_id + Math.pow(10, 13))
                break
            case 'messageChatUpgradeFrom':
                bot_message.migrate_from_chat_id = message.content.basic_group_id
                break
            case 'messageInvoice':
                bot_message.invoice = {
                    title: message.content.title,
                    description: message.content.description,
                    currency: message.content.currency,
                    total_amount: message.content.total_amount,
                    start_parameter: message.content.start_parameter,
                    is_test: message.content.is_test,
                    need_shipping_address: message.content.need_shipping_address,
                    receipt_message_id: _util.get_api_message_id(message.content.receipt_message_id)
                }
                if (message.content.photo) {
                    bot_message.invoice.photo = this.buildPhoto(message.content.photo)
                }
                break
            case 'messagePaymentSuccessfulBot':
                bot_message.successful_payment = {
                    invoice_message_id: _util.get_api_message_id(message.content.invoice_message_id),
                    currency: message.content.currency,
                    total_amount: message.content.total_amount,
                    invoice_payload: message.content.invoice_payload, // Base64?
                    shipping_option_id: message.content.shipping_option_id,
                    telegram_payment_charge_id: message.content.telegram_payment_charge_id,
                    provider_payment_charge_id: message.content.provider_payment_charge_id
                }
                if (message.content.order_info) {
                    bot_message.successful_payment.order_info = await this.buildOrderInfo(message.content.order_info)
                }
                break
            case 'messageWebsiteConnected':
                bot_message.connected_website = message.content.domain_name
                break
            case 'messageScreenshotTaken': 
                bot_message.screenshot_taken = true
                break
            case 'messageUnsupported':
                bot_message.unsupported = true
                break
        }
        if (message.content.caption) {
            if (message.content.caption.text) {
                bot_message.caption = message.content.caption.text
                bot_message.caption_entities = await this.buildEntities(message.content.caption.entities)
            }
        }
        return bot_message
    }

    async buildEntities(entities) {
        let _entities = []
        for (let entity of entities) {
            let _ent = {
                offset: entity.offset,
                length: entity.length
            }
            switch (entity.type['@type']) {
                case 'textEntityTypeBold':
                    _ent.type = 'bold'
                    break
                case 'textEntityTypeBotCommand':
                    _ent.type = 'bot_command'
                    break
                case 'textEntityTypeCashtag':
                    _ent.type = 'cashtag'
                    break
                case 'textEntityTypeCode':
                    _ent.type = 'code'
                    break
                case 'textEntityTypeEmailAddress':
                    _ent.type = 'email'
                    break
                case 'textEntityTypeHashtag':
                    _ent.type = 'hashtag'
                    break
                case 'textEntityTypeItalic':
                    _ent.type = 'italic'
                    break
                case 'textEntityTypeMention':
                    _ent.type = 'mention'
                    break
                case 'textEntityTypeMentionName': {
                    _ent.type = 'text_mention'
                    let mention_user = await this.client.run('getUser', {
                        user_id: entity.type.user_id
                    })
                    _ent.user = await this.buildUser(mention_user, false)
                    break
                }
                case 'textEntityTypePhoneNumber':
                    _ent.type = 'phone'
                    break
                case 'textEntityTypePre':
                    _ent.type = 'pre'
                    break
                case 'textEntityTypePreCode':
                    _ent.type = 'pre'
                    _ent.language = entity.type.language
                    break
                case 'textEntityTypeTextUrl':
                    _ent.type = 'text_link'
                    _ent.url = entity.type.url
                    break
                case 'textEntityTypeUrl':
                    _ent.type = 'url'
                    break
            }
            _entities.push(_ent)
        }
        return _entities
    }

    async buildAnimation(animation) {
        let _ani = {
            file_id: animation.animation.remote.id,
            file_name: animation.file_name,
            mime_type: animation.mime_type,
            file_size: animation.animation.size || animation.animation.expected_size,
            width: animation.width,
            height: animation.height,
            duration: animation.duration
        }
        if (animation.thumbnail) {
            _ani.thumb = await this.buildPhotoSize(animation.thumbnail)
        }
        return _ani
    }

    async buildAudio(audio) {
        let _audio = {
            file_id: audio.audio.remote.id,
            duration: audio.duration,
            performer: audio.performer,
            title: audio.title,
            mime_type: audio.mime_type,
        }
        if (audio.album_cover_thumbnail) {
            _audio.thumb = await this.buildPhotoSize(audio.album_cover_thumbnail)
        }
        return _audio
    }

    async buildTdlibChatAction(action) {
        if (chataction_mirror_table.has(action)) {
            return {
                '@type': chataction_mirror_table.get(action)
            }
        } else {
            return {
                '@type': 'chatActionCancel'
            }
        }
    }

    async buildChatMember(cm) {
        let ret = {}
        if (cm.user_id) {
            let user = await this.client.run('getUser', {
                user_id: cm.user_id
            })
            ret.user = await this.buildUser(user, false)
        }

        if (cm.joined_chat_date) ret.joined_chat_date = cm.joined_chat_date

        const cmstat = cm.status ? cm.status : cm

        ret.status = chat_member_status_mirror_table.get(cmstat['@type'])

        if (cmstat['@type'] == 'chatMemberStatusAdministrator') {
            ret.can_be_edited = cmstat.can_be_edited
            ret.can_change_info = cmstat.can_change_info
            ret.can_post_messages = cmstat.can_post_messages
            ret.can_edit_messages = cmstat.can_edit_messages
            ret.can_delete_messages = cmstat.can_delete_messages
            ret.can_invite_users = cmstat.can_invite_users
            ret.can_restrict_members = cmstat.can_restrict_members
            ret.can_pin_messages = cmstat.can_pin_messages
            ret.can_promote_members = cmstat.can_promote_members
        } else if (cmstat['@type'] == 'chatMemberStatusRestricted') {
            ret.is_member = cmstat.is_member
            ret.until_date = cmstat.restricted_until_date
            ret.can_send_messages = cmstat.can_send_messages
            ret.can_send_media_messages = cmstat.can_send_media_messages
            ret.can_send_other_messages = cmstat.can_send_other_messages
            ret.can_add_web_page_previews = cmstat.can_add_web_page_previews
        } else if (cmstat['@type'] == 'chatMemberStatusBanned') {
            ret.until_date = cmstat.banned_until_date
        } else if (cmstat['@type'] == 'chatMemberStatusCreator') {
            ret.is_member = cmstat.is_member
        }

        if (cm.inviter_user_id) {
            let inviter = await this.client.run('getUser', {
                user_id: cm.inviter_user_id
            })
            ret.inviter = await this.buildUser(inviter, false)
        } 

        return ret
    }

    async buildContact(contact) {
        return {
            phone_number: contact.phone_number,
            first_name: contact.first_name,
            last_name: contact.last_name,
            user_id: contact.user_id,
            vcard: contact.vcard
        }
    }

    async buildDocument(document) {
        let _doc = {
            file_id: document.document.remote.id,
            file_name: document.file_name,
            mime_type: document.mime_type,
            file_size: document.document.size || document.document.expected_size
        }
        if (document.thumbnail) {
            _doc.thumb = await this.buildPhotoSize(document.thumbnail)
        }
        return _doc
    }

    async buildFile(file) {
        return {
            file_id: file.remote.id,
            file_size: file.size
        }
    }

    async buildGame(game) {
        let _game = {
            id: game.id,
            short_name: game.short_name,
            title: game.title,
            description: game.description,
            text: game.text.text,
            // entity
            photo: await this.buildPhoto(game.photo),
        }
        if (game.animation) {
            _game.animation = await this.buildAnimation(game.animation)
        }
        return _game
    }

    async buildInlineQuery(iq) {
        let _iq = {
            id: iq.id,
            from: await this.buildUser(await this.client.run('getUser', { user_id: iq.sender_user_id }), false),
            query: iq.query,
            offset: iq.offset
        }
        if (iq.user_location) {
            _iq.location = await this.buildLocation(iq.user_location)
        }
        return _iq
    }

    async buildTdlibInlineQueryResult(iqr) {
        switch (iqr.type) {
            case 'article':
                return this.buildTdlibInlineQueryResultArticle(iqr)
            case 'photo':
                return this.buildTdlibInlineQueryResultPhoto(iqr)
            case 'gif':
                return this.buildTdlibInlineQueryResultAnimatedGif(iqr)
            case 'mpeg4_gif':
                return this.buildTdlibInlineQueryResultAnimatedMpeg4(iqr)
            case 'video':
                return this.buildTdlibInlineQueryResultVideo(iqr)
            case 'audio':
                return this.buildTdlibInlineQueryResultAudio(iqr)
            case 'voice':
                return this.buildTdlibInlineQueryResultVoiceNote(iqr)
            case 'document':
                return this.buildTdlibInlineQueryResultDocument(iqr)
            case 'location':
                return this.buildTdlibInlineQueryResultLocation(iqr)
            case 'venue':
                return this.buildTdlibInlineQueryResultVenue(iqr)
            case 'contact':
                return this.buildTdlibInlineQueryResultContact(iqr)
            case 'game':
                return this.buildTdlibInlineQueryResultGame(iqr)
            default:
                throw new Error(`Invalid inline query result type: ${iqr.type}`)
        }
    }

    async buildTdlibInlineQueryResultAnimatedGif(gif) {
        let _gif = {
            '@type': 'inputInlineQueryResultAnimatedGif',
            id: gif.id
        }
        if (gif.gif_url) {
            _gif.gif_url = gif.gif_url
            if (gif.thumb_url) _gif.thumbnail_url = gif.thumb_url
        } else if (gif.gif_file_id) {
            _gif.gif_url = gif.gif_file_id
        }
        if (gif.gif_width) {
            _gif.gif_width = gif.gif_width
        }
        if (gif.gif_height) {
            _gif.gif_height = gif.gif_height
        }
        if (gif.gif_duration) {
            _gif.gif_duration = gif.gif_duration
        }
        if (gif.title) {
            _gif.title = gif.title
        }
        if (gif.reply_markup) {
            _gif.reply_markup = this.client._parseReplyMarkup(gif.reply_markup)
        }
        if (gif.input_message_content) {
            _gif.input_message_content = await this.buildTdlibInlineInputMessageContent(gif.input_message_content)
        } else {
            _gif.input_message_content = {
                '@type': 'inputMessageAnimation',
                animation: null,
                thumbnail: null,
            }
            if (gif.gif_duration) {
                _gif.input_message_content.duration = gif.gif_duration
            }
            if (gif.gif_width) {
                _gif.input_message_content.width = gif.gif_width
            }
            if (gif.gif_height) {
                _gif.input_message_content.height = gif.gif_height
            }
            if (gif.caption) {
                _gif.input_message_content.caption = await this.client._generateFormattedText(gif.caption, gif.parse_mode)
            }
        }
        return _gif
    }

    async buildTdlibInlineQueryResultAnimatedMpeg4(mpeg4) {
        let _mpeg4 = {
            '@type': 'inputInlineQueryResultAnimatedMpeg4',
            id: mpeg4.id
        }
        if (mpeg4.mpeg4_url) {
            _mpeg4.mpeg4_url = mpeg4.mpeg4_url
            if (mpeg4.thumb_url) _mpeg4.thumbnail_url = mpeg4.thumb_url
        } else if (mpeg4.mpeg4_file_id) {
            _mpeg4.mpeg4_url = mpeg4.mpeg4_file_id
        }
        if (mpeg4.mpeg4_width) {
            _mpeg4.mpeg4_width = mpeg4.mpeg4_width
        }
        if (mpeg4.mpeg4_height) {
            _mpeg4.mpeg4_height = mpeg4.mpeg4_height
        }
        if (mpeg4.mpeg4_duration) {
            _mpeg4.mpeg4_duration = mpeg4.mpeg4_duration
        }
        if (mpeg4.title) {
            _mpeg4.title = mpeg4.title
        }
        if (mpeg4.reply_markup) {
            _mpeg4.reply_markup = this.client._parseReplyMarkup(mpeg4.reply_markup)
        }
        if (mpeg4.input_message_content) {
            _mpeg4.input_message_content = await this.buildTdlibInlineInputMessageContent(mpeg4.input_message_content)
        } else {
            _mpeg4.input_message_content = {
                '@type': 'inputMessageAnimation',
                animation: null,
                thumbnail: null,
            }
            if (mpeg4.mpeg4_duration) {
                _mpeg4.input_message_content.duration = mpeg4.mpeg4_duration
            }
            if (mpeg4.mpeg4_width) {
                _mpeg4.input_message_content.width = mpeg4.mpeg4_width
            }
            if (mpeg4.mpeg4_height) {
                _mpeg4.input_message_content.height = mpeg4.mpeg4_height
            }
            if (mpeg4.caption) {
                _mpeg4.input_message_content.caption = await this.client._generateFormattedText(mpeg4.caption, mpeg4.parse_mode)
            }
        }
        return _mpeg4
    }

    async buildTdlibInlineQueryResultArticle(article) {
        let _article = {
            '@type': 'inputInlineQueryResultArticle',
            id: article.id,
            title: article.title,
            hide_url: !!article.hide_url
        }
        if (article.url) {
            _article.url = article.url
        }
        if (article.description) {
            _article.description = article.description
        }
        if (article.thumb_url) {
            _article.thumbnail_url = article.thumb_url
        }
        if (article.thumb_width) {
            _article.thumbnail_width = article.thumb_width
        }
        if (article.thumb_height) {
            _article.thumbnail_height = article.thumb_height
        }
        if (article.reply_markup) {
            _article.reply_markup = this.client._parseReplyMarkup(article.reply_markup)
        }
        if (article.input_message_content) {
            _article.input_message_content = await this.buildTdlibInlineInputMessageContent(article.input_message_content)
        } else {
            throw new Error('Input_message_content not exist')
        }
        return _article
    }

    async buildTdlibInlineQueryResultAudio(audio) {
        let _audio = {
            id: audio.id,
            audio_url: audio.audio_url || audio.audio_file_id
        }
        if (audio.performer) {
            _audio.performer = audio.performer
        }
        if (audio.audio_duration) {
            _audio.audio_duration = audio.audio_duration
        }
        if (audio.title) {
            _audio.title = audio.title
        }
        if (audio.reply_markup) {
            _audio.reply_markup = this.client._parseReplyMarkup(audio.reply_markup)
        }
        if (audio.input_message_content) {
            _audio.input_message_content = await this.buildTdlibInlineInputMessageContent(audio.input_message_content)
        } else {
            _audio.input_message_content = {
                '@type': 'inputMessageAudio',
                audio: null,
                album_cover_thumbnail: null
            }
            if (audio.audio_duration) {
                _audio.input_message_content.duration = audio.audio_duration
            }
            if (audio.title) {
                _audio.input_message_content.title = audio.title
            }
            if (audio.performer) {
                _audio.input_message_content.performer = audio.performer
            }
            if (audio.caption) {
                _audio.input_message_content.caption = await this.client._generateFormattedText(audio.caption, audio.parse_mode)
            }
        }
        return _audio
    }

    async buildTdlibInlineQueryResultContact(contact) {
        let _contact = {
            '@type': 'inputInlineQueryResultContact',
            id: contact.id,
            contact: {
                first_name: contact.first_name,
                phone_number: contact.phone_number
            }
        }
        if (contact.last_name) {
            _contact.contact.last_name = contact.last_name
        }
        if (contact.vcard) {
            _contact.contact.vcard = contact.vcard
        }
        if (contact.thumb_url) {
            _contact.thumbnail_url = contact.thumb_url
        }
        if (contact.thumb_width) {
            _contact.thumbnail_width = contact.thumb_width
        }
        if (contact.thumb_height) {
            _contact.thumbnail_height = contact.thumb_height
        }
        if (contact.title) {
            _contact.title = contact.title
        }
        if (contact.reply_markup) {
            _contact.reply_markup = this.client._parseReplyMarkup(contact.reply_markup)
        }
        if (contact.input_message_content) {
            _contact.input_message_content = await this.buildTdlibInlineInputMessageContent(contact.input_message_content)
        } else {
            _contact.input_message_content = {
                '@type': 'inputMessageContact',
                contact: _contact.contact
            }
        }
        return _contact
    }

    async buildTdlibInlineQueryResultDocument(document) {
        let _document = {
            '@type': 'inputInlineQueryResultDocument',
            id: document.id,
            document_url: document.document_url || document.document_file_id
        }
        if (document.mime_type) {
            _document.mime_type = document.mime_type
        }
        if (document.title) {
            _document.title = document.title
        }
        if (document.description) {
            _document.description = document.description
        }
        if (document.reply_markup) {
            _document.reply_markup = this.client._parseReplyMarkup(document.reply_markup)
        }
        if (document.input_message_content) {
            _document.input_message_content = await this.buildTdlibInlineInputMessageContent(document.input_message_content)
        } else {
            _document.input_message_content = {
                '@type': 'inputMessageDocument',
                document: null,
                thumbnail: null
            }
            if (document.caption) {
                _document.input_message_content.caption = await this.client._generateFormattedText(document.caption, document.parse_mode)
            }
        }
        return _document
    }

    async buildTdlibInlineQueryResultGame(game) {
        let _game = {
            '@type': 'inputInlineQueryResultGame',
            id: game.id,
            game_short_name: game.game_short_name
        }
        if (game.reply_markup) {
            _game.reply_markup = this.client._parseReplyMarkup(game.reply_markup)
        }
        return _game
    }

    async buildTdlibInlineQueryResultLocation(location) {
        let _location = {
            '@type': 'inputInlineQueryResultLocation',
            id: location.id,
            location: {
                latitude: location.latitude,
                longitude: location.longitude
            }
        }
        if (location.live_period) {
            _location.live_period = location.live_period
        }
        if (location.thumb_url) {
            _location.thumbnail_url = location.thumb_url
        }
        if (location.thumb_width) {
            _location.thumbnail_width = location.thumb_width
        }
        if (location.thumb_height) {
            _location.thumbnail_height = location.thumb_height
        }
        if (location.title) {
            _location.title = location.title
        }
        if (location.reply_markup) {
            _location.reply_markup = this.client._parseReplyMarkup(location.reply_markup)
        }
        if (location.input_message_content) {
            _location.input_message_content = await this.buildTdlibInlineInputMessageContent(location.input_message_content)
        } else {
            _location.input_message_content = {
                '@type': 'inputMessageLocation',
                location: null
            }
            if (location.live_period) {
                _location.input_message_content.live_period = location.live_period // TODO: is null or copy?
            }
        }
        return _location
    }

    async buildTdlibInlineQueryResultPhoto(photo) {
        let _photo = {
            '@type': 'inputInlineQueryResultPhoto',
            id: photo.id
        }
        if (photo.photo_url) {
            _photo.photo_url = photo.photo_url
            _photo.thumbnail_url = photo.thumb_url || photo.photo_url
        } else if (photo.photo_file_id) {
            _photo.photo_url = photo.photo_file_id
        }
        if (photo.photo_width) {
            _photo.photo_width = photo.photo_width
        }
        if (photo.photo_height) {
            _photo.photo_height = photo.photo_height
        }
        if (photo.description) {
            _photo.description = photo.description
        }
        if (photo.title) {
            _photo.title = photo.title
        }
        if (photo.reply_markup) {
            _photo.reply_markup = this.client._parseReplyMarkup(photo.reply_markup)
        }
        if (photo.input_message_content) {
            _photo.input_message_content = await this.buildTdlibInlineInputMessageContent(photo.input_message_content)
        } else {
            _photo.input_message_content = {
                '@type': 'inputMessagePhoto',
                photo: null,
                thumbnail: null,
            }
            if (photo.photo_width) {
                _photo.input_message_content.width = photo.photo_width
            }
            if (photo.photo_height) {
                _photo.input_message_content.height = photo.photo_height
            }
            if (photo.caption) {
                _photo.input_message_content.caption = await this.client._generateFormattedText(photo.caption, photo.parse_mode)
            }
        }
        return _photo
    }

    async buildTdlibInlineQueryResultSticker(sticker) {
        let _sticker = {
            '@type': 'inputInlineQueryResultSticker',
            id: sticker.id
        }
        if (sticker.sticker_url) {
            _sticker.sticker_url = sticker.sticker_url
            _sticker.thumbnail_url = sticker.thumb_url || sticker.sticker_url
        } else if (sticker.sticker_file_id) {
            _sticker.sticker_url = sticker.sticker_file_id
        }
        if (sticker.sticker_width) {
            _sticker.sticker_width = sticker.sticker_width
        }
        if (sticker.sticker_height) {
            _sticker.sticker_height = sticker.sticker_height
        }
        if (sticker.description) {
            _sticker.description = sticker.description
        }
        if (sticker.title) {
            _sticker.title = sticker.title
        }
        if (sticker.reply_markup) {
            _sticker.reply_markup = this.client._parseReplyMarkup(sticker.reply_markup)
        }
        if (sticker.input_message_content) {
            _sticker.input_message_content = await this.buildTdlibInlineInputMessageContent(sticker.input_message_content)
        } else {
            _sticker.input_message_content = {
                '@type': 'inputMessageSticker',
                sticker: null,
                thumbnail: null,
            }
            if (sticker.sticker_width) {
                _sticker.input_message_content.width = sticker.sticker_width
            }
            if (sticker.sticker_height) {
                _sticker.input_message_content.height = sticker.sticker_height
            }
            if (sticker.caption) {
                _sticker.input_message_content.caption = await this.client._generateFormattedText(sticker.caption, sticker.parse_mode)
            }
        }
        return _sticker
    }

    async buildTdlibInlineQueryResultVenue(venue) {
        let _venue = {
            '@type': 'inputInlineQueryResultVenue',
            id: venue.id,
            venue: {
                location: {
                    latitude: venue.latitude,
                    longitude: venue.longitude
                },
                title: venue.title,
                address: venue.address,
                provider: 'foursquare'
            }
        }
        if ('foursquare_id' in venue) {
            _venue.venue.provider = 'foursquare'
            _venue.venue.id = venue.foursquare_id
        }
        if (venue.thumb_url) {
            _venue.thumbnail_url = venue.thumb_url
        }
        if (venue.thumb_width) {
            _venue.thumbnail_width = venue.thumb_width
        }
        if (venue.thumb_height) {
            _venue.thumbnail_height = venue.thumb_height
        }
        if (venue.reply_markup) {
            _venue.reply_markup = this.client._parseReplyMarkup(venue.reply_markup)
        }
        if (venue.input_message_content) {
            _venue.input_message_content = await this.buildTdlibInlineInputMessageContent(venue.input_message_content)
        } else {
            _venue.input_message_content = {
                '@type': 'inputMessageVenue',
                venue: null
            }
        }
        return _venue
    }

    async buildTdlibInlineQueryResultVideo(video) {
        let _video = {
            '@type': 'inputInlineQueryResultVideo',
            id: video.id
        }
        if (video.video_url) {
            _video.video_url = video.video_url
            if (video.thumb_url) _video.thumbnail_url = video.thumb_url
        } else if (video.video_file_id) {
            _video.video_url = video.video_file_id
        }
        if (video.video_width) {
            _video.video_width = video.video_width
        }
        if (video.video_height) {
            _video.video_height = video.video_height
        }
        if (video.video_duration) {
            _video.video_duration = video.video_duration
        }
        if (video.mime_type) {
            _video.mime_type = video.mime_type
        }
        if (video.description) {
            _video.description = video.description
        }
        if (video.title) {
            _video.title = video.title
        }
        if (video.reply_markup) {
            _video.reply_markup = this.client._parseReplyMarkup(video.reply_markup)
        }
        if (video.input_message_content) {
            _video.input_message_content = await this.buildTdlibInlineInputMessageContent(video.input_message_content)
        } else {
            _video.input_message_content = {
                '@type': 'inputMessageVideo',
                video: null,
                thumbnail: null
            }
            if (video.video_width) {
                _video.input_message_content.width = video.video_width // TODO: Omit these in the future. (Need test)
            }
            if (video.video_height) {
                _video.input_message_content.height = video.video_height
            }
            if (video.video_duration) {
                _video.input_message_content.duration = video.video_duration
            }
            if (video.caption) {
                _video.input_message_content.caption = await this.client._generateFormattedText(video.caption, video.parse_mode)
            }
        }
        return _video
    }

    async buildTdlibInlineQueryResultVoiceNote(voicenote) {
        let _voicenote = {
            '@type': 'inputInlineQueryResultVoiceNote',
            id: voicenote.id
        }
        if (voicenote.voicenote_url) {
            _voicenote.video_note_url = voicenote.voice_url
            if (voicenote.thumb_url) _voicenote.thumbnail_url = voicenote.thumb_url
        } else if (voicenote.voice_file_id) {
            _voicenote.voice_note_url = voicenote.voice_file_id
        }
        if (voicenote.voicenote_width) {
            _voicenote.voice_note_duration = voicenote.voice_duration
        }
        if (voicenote.title) {
            _voicenote.title = voicenote.title
        }
        if (voicenote.reply_markup) {
            _voicenote.reply_markup = this.client._parseReplyMarkup(voicenote.reply_markup)
        }
        if (voicenote.input_message_content) {
            _voicenote.input_message_content = await this.buildTdlibInlineInputMessageContent(voicenote.input_message_content)
        } else {
            _voicenote.input_message_content = {
                '@type': 'inputMessageVoiceNote',
                voice_note: null,
                thumbnail: null
            }
            if (voicenote.voice_duration) {
                _voicenote.input_message_content.duration = voicenote.voice_duration
            }
            if (voicenote.caption) {
                _voicenote.input_message_content.caption = await this.client._generateFormattedText(voicenote.caption, voicenote.parse_mode)
            }
        }
        return _voicenote
    }

    // TODO: Support other types
    async buildTdlibInlineInputMessageContent(imc) {
        if ('message_text' in imc) {
            return {
                '@type': 'inputMessageText',
                text: await this.client._generateFormattedText(imc.message_text, imc.parse_mode),
                disable_web_page_preview: !!imc.disable_web_page_preview
            }
        } else if ('latitude' in imc && 'longitude' in imc && 'title' in imc && 'address' in imc) {
            let ret = {
                '@type': 'inputMessageVenue',
                venue: {
                    location: {
                        latitude: imc.latitude,
                        longitude: imc.longitude
                    },
                    title: imc.title,
                    address: imc.address,
                    provider: 'foursquare',
                    id: imc.foursquare_id
                }
            }
            return ret
        } else if ('latitude' in imc && 'longitude' in imc) {
            let ret = {
                '@type': 'inputMessageLocation',
                location: {
                    latitude: imc.latitude,
                    longitude: imc.longitude
                }
            }
            if (imc.live_period >= 60 && imc.live_period <= 86400) {
                ret.live_period = imc.live_period
            } else {
                ret.live_period = 0
            }
            return ret
        } else if ('phone_number' in imc && 'first_name' in imc) {
            return {
                '@type': 'inputMessageContact',
                contact: {
                    phone_number: imc.phone_number,
                    first_name: imc.first_name,
                    last_name: imc.last_name || ''
                }
            }
        }
    }

    async buildLocation(location) {
        return {
            latitude: location.latitude,
            longitude: location.longitude
        }
    }

    async buildMaskPosition(mask_position) {
        return {
            point: maskpoint_mirror_table.get(mask_position.point['@type']),
            x_shift: mask_position.x_shift,
            y_shift: mask_position.y_shift,
            scale: mask_position.scale
        }
    }

    async buildTdlibMaskPosition(mask_position) {
        return {
            '@type': 'maskPosition',
            point: {
                '@type': maskpoint_mirror_table_reversed.get(mask_position.point)
            },
            x_shift: mask_position.x_shift,
            y_shift: mask_position.y_shift,
            scale: mask_position.scale
        }
    }

    async buildTdlibMedia(media) {
        let ret
        switch (media.type) {
            case 'photo':
                ret = {
                    '@type': 'inputMessagePhoto',
                    photo: await this.client._prepareUploadFile(media.media)
                }
                if (media.caption) ret.caption = await this.client._generateFormattedText(media.caption, media.parse_mode)
                return ret
            case 'video':
                ret = {
                    '@type': 'inputMessageVideo',
                    video: await this.client._prepareUploadFile(media.media),
                    supports_streaming: media.supports_streaming
                }
                if (media.thumb) ret.thumbnail = await this.client._prepareUploadFile(media.thumb)
                if (media.caption) ret.caption = await this.client._generateFormattedText(media.caption, media.parse_mode)
                if (media.height) ret.height = media.height
                if (media.width) ret.width = media.width
                if (media.duration) ret.duration = media.duration
                return ret
            case 'animation':
                ret = {
                    '@type': 'inputMessageAnimation',
                    animation: await this.client._prepareUploadFile(media.media),
                }
                if (media.thumb) ret.thumbnail = await this.client._prepareUploadFile(media.thumb)
                if (media.caption) ret.caption = await this.client._generateFormattedText(media.caption, media.parse_mode)
                if (media.height) ret.height = media.height
                if (media.width) ret.width = media.width
                if (media.duration) ret.duration = media.duration
                return ret
            case 'audio':
                ret = {
                    '@type': 'inputMessageAudio',
                    audio: await this.client._prepareUploadFile(media.media),
                }
                if (media.thumb) ret.album_cover_thumbnail = await this.client._prepareUploadFile(media.thumb)
                if (media.caption) ret.caption = await this.client._generateFormattedText(media.caption, media.parse_mode)
                if (media.performer) ret.performer = media.performer
                if (media.title) ret.title = media.title
                if (media.duration) ret.duration = media.duration
                return ret
            case 'document':
                ret = {
                    '@type': 'inputMessageDocument',
                    document: await this.client._prepareUploadFile(media.media),
                }
                if (media.thumb) ret.thumbnail = await this.client._prepareUploadFile(media.thumb)
                if (media.caption) ret.caption = await this.client._generateFormattedText(media.caption, media.parse_mode)
                return ret
        }
    }

    async buildOrderInfo(order_info) {
        let _oi = {
            name: order_info.name,
            phone_number: order_info.phone_number,
            email: order_info.email_address
        }
        if (order_info.shipping_address) {
            _oi.shipping_address = await this.buildShippingAddress(order_info.shipping_address)
        }
        return _oi
    }

    async buildPhoto(photo) {
        let _photo = []
        for (let p of photo.sizes) {
            _photo.push(await this.buildPhotoSize(p))
        }
        return _photo
    }

    async buildPhotoSize(photo_size) {
        return {
            type: photo_size.type,
            file_id: photo_size.photo.remote.id,
            width: photo_size.width,
            height: photo_size.height,
            file_size: photo_size.photo.size || photo_size.photo.expected_size
        }
    }

    async buildShippingAddress(shipping_address) {
        return {
            country_code: shipping_address.country_code,
            state: shipping_address.state,
            city: shipping_address.city,
            street_line1: shipping_address.street_line1,
            street_line2: shipping_address.street_line2,
            post_code: shipping_address.postal_code
        }
    }

    async buildSticker(sticker, include_set = true) {
        let _sticker = {
            set_id: sticker.set_id,
            file_id: sticker.sticker.remote.id,
            height: sticker.height,
            width: sticker.width,
            emoji: sticker.emoji,
            is_mask: sticker.is_mask,
            file_size: sticker.sticker.size || sticker.sticker.expected_size
        }
        if (sticker.mask_position) {
            _sticker.mask_position = await this.buildMaskPosition(sticker.mask_position)
        }
        if (sticker.thumbnail) {
            _sticker.thumb = await this.buildPhotoSize(sticker.thumbnail)
        }
        if (sticker.set_id && include_set) {
            try {
                let set = await this.client.run('getStickerSet', {
                    set_id: sticker.set_id
                })
                _sticker.set_name = set.name
                _sticker.set_title = set.title
                _sticker.set_official = set.is_official
            } catch (e) {
                // just ignore this
            }
        }
        return _sticker
    }

    async buildStickerSet(set) {
        let _set = {
            id: set.id,
            title: set.title,
            name: set.name,
            is_official: set.is_official,
            is_masks: set.is_masks,
            stickers: []
        }
        for (let s of set.stickers)
            _set.stickers.push(await this.buildSticker(s, false))
        return _set
    }

    async buildUserProfilePhotos(upps) {
        let _photos = []
        for (let p of upps.photos) {
            _photos.push(await this.buildPhoto(p))
        }
        return {
            total_count: upps.total_count,
            photos: _photos
        }
    }

    async buildVenue(venue) {
        return {
            title: venue.title,
            address: venue.address,
            provider: venue.provider,
            id: venue.id,
            [venue.provider + '_id']: venue.id,
            location: await this.buildLocation(venue.location)
        }
    }

    async buildVideo(video) {
        let _ani = {
            file_id: video.video.remote.id,
            file_name: video.file_name,
            mime_type: video.mime_type,
            file_size: video.video.size || video.video.expected_size,
            width: video.width,
            height: video.height,
            duration: video.duration,
            supports_streaming: video.supports_streaming,
            has_stickers: video.has_stickers
        }
        if (video.thumbnail) {
            _ani.thumb = await this.buildPhotoSize(video.thumbnail)
        }
        return _ani
    }

    async buildVideoNote(video_note) {
        let _videonote = {
            file_id: video_note.video.remote.id,
            duration: video_note.duration,
            length: video_note.length,
            file_size: video_note.video.size || video_note.video.expected_size
        }
        if (video_note.thumbnail) {
            _videonote.thumb = await this.buildPhotoSize(video_note.thumbnail)
        }
        return _videonote
    }

    async buildVoice(voice) {
        return {
            file_id: voice.voice.remote.id,
            duration: voice.duration,
            waveform: voice.waveform,
            mime_type: voice.mime_type,
            file_size: voice.voice.size || voice.voice.expected_size
        }
    }
}

module.exports = BotTypeConversion
