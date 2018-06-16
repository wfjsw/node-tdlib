const _util = require('./util')

const maskpoint_mirror_table = new Map([
    ['maskPointChin', 'chin'],
    ['maskPointEyes', 'eyes'],
    ['maskPointForehead', 'forehead'],
    ['maskPointMouth', 'mouth']
])


class BotTypeConversion {
    constructor(TdClient) {
        if (!TdClient) throw new Error('You have to pass a functional TdClient for this to work.')
        this.client = TdClient
    }
    async buildUser(user, out_full = false) {
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
            bot_chat.status = _util.getStatus(additional.status)
            bot_chat.member_count = additional.member_count
            bot_chat.is_verified = additional.is_verified
            bot_chat.restriction_reason = additional.restriction_reason
            if (out_full) {
                try {
                    let additional_full = await this.client.run('getSupergroupFullInfo', {
                        supergroup_id: chat.type.supergroup_id
                    })

                    // Weird issue: https://github.com/tdlib/td/issues/289
                    try { // REMOVE THIS
                        if (additional_full.pinned_message_id) {
                            let pin_msg_orig = await this.client.run('getChatPinnedMessage', {
                                chat_id: chat.id
                            })
                            bot_chat.pinned_message = await this.buildMessage(pin_msg_orig, true)
                        }
                    } catch (e) { } // REMOVE THIS

                    if (additional_full.sticker_set_id != "0") {
                        let sticker_set = await this.client.run('getStickerSet', {
                            set_id: additional_full.sticker_set_id
                        })
                        bot_chat.sticker_set_name = sticker_set.name
                        bot_chat.sticker_set_id = additional_full.sticker_set_id
                    }

                    bot_chat.administrator_count = additional_full.administrator_count
                    bot_chat.restricted_count = additional_full.restricted_count
                    bot_chat.banned_count = additional_full.banned_count
                    bot_chat.can_get_members = additional_full.can_get_members
                    bot_chat.can_set_username = additional_full.can_set_username
                    bot_chat.can_set_sticker_set = additional_full.can_set_sticker_set
                    bot_chat.is_all_history_available = additional_full.is_all_history_available
                    if (!isNaN(additional_full.migrate_from_chat_id))
                        bot_chat.migrate_from_chat_id = -additional_full.upgraded_from_basic_group_id
                } catch (e) {
                    console.error(e)
                }
            }
        } else if (chat.type['@type'] == 'chatTypeBasicGroup') {
            let additional = await this.client.run('getBasicGroup', {
                basic_group_id: chat.type.basic_group_id
            })
            bot_chat.type = 'group'
            bot_chat.all_members_are_administrators = additional.everyone_is_administrator
            bot_chat.is_active = additional.is_active
            if (out_full) {
                let additional_full = await this.client.run('getBasicGroupFullInfo', {
                    basic_group_id: chat.type.basic_group_id
                })
                bot_chat.creator = additional_full.creator_user_id
                // members here? really?
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
                let reply_msg = await this.client.run('getRepliedMessage', {
                    chat_id: message.chat_id,
                    message_id: message.id
                })
                bot_message.reply_to_message = await this.buildMessage(reply_msg, follow_replies_level - 1)
            }
        }
        if (message.media_group_id)
            bot_message.media_group_id = message.media_group_id
        if ('views' in message)
            bot_message.views = message.views
        if (message.forward_info)
            switch (message.forward_info['@type']) {
                case 'messageForwardedFromUser':
                    let fwd_user = await this.client.run('getUser', {
                        user_id: message.forward_info.sender_user_id
                    })
                    bot_message.forward_from = await this.buildUser(fwd_user, false)
                    bot_message.forward_date = message.forward_info.date
                    break
                case 'messageForwardedPost':
                    let fwd_chat = await this.client.run('getChat', {
                        chat_id: message.forward_info.chat_id
                    })
                    bot_message.forward_from_chat = await this.buildChat(fwd_chat, false)
                    bot_message.forward_from_message_id = _util.get_api_message_id(message.forward_info.message_id)
                    bot_message.forward_date = message.forward_info.date
                    bot_message.forward_signature = message.forward_info.author_signature
                    break
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
            case 'messageChatAddMembers':
                let new_members = []
                for (let uid of message.content.member_user_ids) {
                    let new_member = await this.client.run('getUser', { user_id: uid })
                    new_members.push(await this.buildUser(new_member, false))
                }
                bot_message.new_chat_members = new_members
                bot_message.new_chat_member = new_members[0]
                break
            case 'messageChatJoinByLink':
                bot_message.new_chat_members = [bot_message.from]
                bot_message.new_chat_member = bot_message.from
                break
            case 'messageChatDeleteMember':
                let left_member = await this.client.run('getUser', { user_id: message.content.user_id })
                bot_message.left_chat_member = await this.buildUser(left_member, false)

                // NOTE: we didn't get this msg when the bot itself got kicked.
                // Instead, we got this:
                // {"@type":"updateSupergroup","supergroup":{"@type":"supergroup","id":***,"username":"","date":0,"status":{"@type":"chatMemberStatusBanned","banned_until_date":0},"member_count":0,"anyone_can_invite":false,"sign_messages":true,"is_channel":false,"is_verified":false,"restriction_reason":""}}
                // ^ got banned
                // {"@type":"updateSupergroup","supergroup":{"@type":"supergroup","id":***,"username":"","date":1529156811,"status":{"@type":"chatMemberStatusLeft"},"member_count":0,"anyone_can_invite":true,"sign_messages":true,"is_channel":false,"is_verified":false,"restriction_reason":""}}
                // ^ got unbanned

                break
            case 'messageChatChangeTitle':
                bot_message.new_chat_title = message.content.title
                break
            case 'messageChatChangePhoto':
                bot_message.new_chat_photo = await this.buildPhoto(message.content.photo)
                break
            case 'messageChatDeletePhoto':
                bot_message.delete_chat_photo = true
                break
            case 'messageBasicGroupChatCreate':
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
                case 'textEntityTypeMentionName':
                    _ent.type = 'text_mention'
                    let mention_user = await this.client.run('getUser', {
                        user_id: entity.type.user_id
                    })
                    _ent.user = await this.buildUser(mention_user, false)
                    break
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

    async buildContact(contact) {
        return {
            phone_number: contact.phone_number,
            first_name: contact.first_name,
            last_name: contact.last_name,
            user_id: contact.user_id
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
            let set = await this.client.run('getStickerSet', {
                set_id: sticker.set_id
            })
            _sticker.set_name = set.name
            _sticker.set_title = set.title
            _sticker.set_official = set.is_official
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
