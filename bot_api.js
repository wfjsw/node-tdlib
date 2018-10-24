// https://core.telegram.org/bots/api

const stream = require('stream')
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const crypto = require('crypto')
const lib = require('./td_client_actor')
const _util = require('./util')

lib.td_set_log_verbosity_level(2)

class Bot extends lib.TdClientActor {
    constructor(api_id, api_hash, bot_token, use_test_dc = false, identifier = null, options = {}) {
        if (!api_id || !api_hash) throw new Error('missing api_id, api_hash')
        if (identifier === null) identifier = `bot${bot_token.split(':')[0]}`
        super({
            api_id,
            api_hash,
            identifier,
            use_test_dc,
            use_message_database: false,
            use_secret_chats: false,
            use_chat_info_database: false,
            use_file_database: false
        })
        this.bot_id = parseInt(bot_token.split(':')[0])
        this._identifier = identifier
        if (options.encrypt_callback_query) {
            this._encrypt_callback_query = crypto.scryptSync(bot_token, this._encryption_key, 32)
        } else {
            this._encrypt_callback_query = false
        }
        let self = this
        this.ready = false
        this._inited_chat = new Set()

        if (bot_token) {
            this.on('__updateAuthorizationState', async (update) => {
                switch (update.authorization_state['@type']) {
                    case 'authorizationStateWaitPhoneNumber':
                        return this.run('checkAuthenticationBotToken', {
                            token: bot_token
                        })
                }
            })
        }
        this.on('__updateMessageSendSucceeded', (update) => {
            this.emit(`_msgSent:${update.old_message_id}`, update)
        })
        this.on('__updateMessageSendFailed', (update) => {
            this.emit(`_msgFail:${update.old_message_id}`, update)
        })
        this.on('__updateNewMessage', (update) => {
            this._processIncomingUpdate.call(self, update.message)
        })
        this.on('__updateMessageEdited', (update) => {
            this._processIncomingEdit.call(self, update)
        })
        this.on('__updateNewInlineQuery', (update) => {
            this._processIncomingInlineQuery.call(self, update)
        })
        this.on('__updateNewCallbackQuery', (update) => {
            this._processIncomingCallbackQuery.call(self, update)
        })
        this.on('__updateNewInlineCallbackQuery', (update) => {
            this._processIncomingCallbackQuery.call(self, update)
        })
        this.on('__updateNewChosenInlineResult', (update) => {
            this._processIncomingChosenInlineResult.call(self, update)
        })
        this.once('ready', () => this.ready = true)
        this.once('ready', () => {
            this.run('setOption', {
                name: 'ignore_inline_thumbnails',
                value: {
                    '@type': 'optionValueBoolean',
                    value: true
                }
            })
            this.run('setOption', {
                name: 'use_storage_optimizer',
                value: {
                    '@type': 'optionValueBoolean',
                    value: true
                }
            })
        })
        this.conversion = new (require('./bot_types'))(this)
    }

    async getMe() {
        if (!this.ready) throw new Error('Not ready.')
        let me = await this.run('getMe', {})
        return this.conversion.buildUser(me, true)
    }

    async sendMessage(chat_id, text, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageText',
            disable_web_page_preview: options.disable_web_page_preview,
            text: await this._generateFormattedText(text, options.parse_mode)
        }
        return this._sendMessage(chat_id, media, options)
    }

    async forwardMessage(chat_id, from_chat_id, message_ids, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (!Array.isArray(message_ids)) message_ids = [message_ids]
        chat_id = await this._checkChatId(chat_id)
        from_chat_id = await this._checkChatId(from_chat_id)
        message_ids = message_ids.map((id) => _util.get_tdlib_message_id(id))
        let opt = {
            chat_id,
            from_chat_id,
            message_ids,
            disable_notification: !!options.disable_notification,
            from_background: true
        }
        await this._initChatIfNeeded(chat_id)
        await this._initChatIfNeeded(from_chat_id)
        let ret = await this.run('forwardMessages', opt)
        if (ret.total_count == 1) {
            return this.conversion.buildMessage(ret.messages[0])
        } else {
            let _msgs = []
            for (let m of ret.messages) {
                _msgs.push(await this.buildMessage(m, 0))
            }
            return _msgs
        }
    }

    async sendPhoto(chat_id, photo, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessagePhoto',
            photo: await this._prepareUploadFile(photo)
        }
        if (options.caption)
            media.caption = await this._generateFormattedText(options.caption, options.parse_mode)
        if (options.ttl)
            media.ttl = options.ttl
        return this._sendMessage(chat_id, media, options)
    }

    async sendAudio(chat_id, audio, options = {}, file_options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageAudio',
            audio: await this._prepareUploadFile(audio, file_options.filename)
        }
        if (options.caption)
            media.caption = await this._generateFormattedText(options.caption, options.parse_mode)
        if (options.duration)
            media.duration = options.duration
        if (options.title)
            media.title = options.title
        if (options.performer)
            media.performer = options.performer
        return this._sendMessage(chat_id, media, options)
    }

    async sendDocument(chat_id, document, options = {}, file_options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageDocument',
            document: await this._prepareUploadFile(document, file_options.filename)
        }
        if (options.caption)
            media.caption = await this._generateFormattedText(options.caption, options.parse_mode)
        return this._sendMessage(chat_id, media, options)
    }

    async sendVideo(chat_id, video, options = {}, file_options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageVideo',
            video: await this._prepareUploadFile(video, file_options.filename)
        }
        if (options.caption)
            media.caption = await this._generateFormattedText(options.caption, options.parse_mode)
        if (options.duration)
            media.duration = options.duration
        if (options.width)
            media.width = options.width
        if (options.height)
            media.height = options.height
        if ('supports_streaming' in options)
            media.supports_streaming = options.supports_streaming
        if (options.ttl)
            media.ttl = options.ttl
        return this._sendMessage(chat_id, media, options)
    }

    async sendVoice(chat_id, voice, options = {}, file_options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageVoiceNote',
            voice_note: await this._prepareUploadFile(voice, file_options.filename)
        }
        if (options.caption)
            media.caption = await this._generateFormattedText(options.caption, options.parse_mode)
        if (options.duration)
            media.duration = options.duration
        return this._sendMessage(chat_id, media, options)
    }

    async sendVideoNote(chat_id, video_note, options = {}, file_options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageVideoNote',
            video_note: await this._prepareUploadFile(video_note, file_options.filename)
        }
        if (options.caption)
            media.caption = await this._generateFormattedText(options.caption, options.parse_mode)
        if (options.duration)
            media.duration = options.duration
        if (options.length)
            media.length = options.length
        return this._sendMessage(chat_id, media, options)
    }

    async sendMediaGroup(chat_id, medias, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let _medias = []
        for (let md of medias) {
            if (md.type == 'photo') {
                let _md = {
                    '@type': 'inputMessagePhoto',
                    photo: await this._prepareUploadFile(md.media)
                }
                if (md.caption)
                    _md.caption = await this._generateFormattedText(md.caption, md.parse_mode)
                _medias.push(_md)
            } else if (md.type == 'video') {
                let _md = {
                    '@type': 'inputMessageVideo',
                    video: await this._prepareUploadFile(_md.media)
                }
                if (md.caption)
                    _md.caption = await this._generateFormattedText(md.caption, md.parse_mode)
                if (md.duration)
                    _md.duration = md.duration
                if (md.width)
                    _md.width = md.width
                if (md.height)
                    _md.height = md.height
                if ('supports_streaming' in md)
                    _md.supports_streaming = md.supports_streaming
                _medias.push(_md)
            }
        }
        if (_medias.length < 2 || _medias.length > 10) throw new Error('Medias must include 2-10 items.')
        return this._sendMessageAlbum(chat_id, _medias, options)
    }

    async sendLocation(chat_id, lat, long, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageLocation',
            location: {
                '@type': 'location',
                latitude: lat,
                longitude: long
            }
        }
        if (options.live_period) {
            media.live_period = options.live_period
        } else {
            media.live_period = 0
        }
        return this._sendMessage(chat_id, media, options)
    }

    async editMessageLiveLocation(latitude, longitude, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (options.chat_id && options.message_id) {
            options.chat_id = await this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = await this.run('getMessage', {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id)
            })
            if (orig_msg.content['@type'] != 'messageLocation') throw new Error('Target message is not a live location.')
            if (orig_msg.content.expires_in <= 0) throw new Error('Target live location is expired.')
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
                location: {
                    latitude,
                    longitude
                }
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            } else if (options.preserve_reply_markup) {
                if (orig_msg.reply_markup) {
                    _opt.reply_markup = orig_msg.reply_markup
                }
            }
            let ret = await this.run('editMessageLiveLocation', _opt)
            return this.conversion.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
                location: {
                    latitude,
                    longitude
                }
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            }
            let ret = await this.run('editMessageLiveLocation', _opt)
            if (ret['@type'] == 'ok')
                return true
            else throw ret
        } else {
            throw new Error('Please specify chat_id and message_id or inline_message_id.')
        }
    }

    async stopMessageLiveLocation(options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (options.chat_id && options.message_id) {
            options.chat_id = await this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = await this.run('getMessage', {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id)
            })
            if (orig_msg.content['@type'] != 'messageLocation') throw new Error('Target message is not a live location.')
            if (orig_msg.content.expires_in <= 0) throw new Error('Target live location is expired.')
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
                location: null
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            } else if (options.preserve_reply_markup) {
                if (orig_msg.reply_markup) {
                    _opt.reply_markup = orig_msg.reply_markup
                }
            }
            let ret = await this.run('editMessageLiveLocation', _opt)
            return _util.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
                location: null
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            }
            let ret = await this.run('editMessageLiveLocation', _opt)
            if (ret['@type'] == 'ok')
                return true
            else throw ret
        } else {
            throw new Error('Please specify chat_id and message_id or inline_message_id.')
        }
    }

    async sendVenue(chat_id, lat, long, title, address, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            venue: {
                '@type': 'inputMessageVenue',
                location: {
                    '@type': 'location',
                    latitude: lat,
                    longitude: long
                },
                title,
                address,
                provider: 'foursquare',
                id: options.foursquare_id || 0
            }
        }
        return this._sendMessage(chat_id, media, options)
    }

    async sendContact(chat_id, phone_number, first_name, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            contact: {
                '@type': 'inputMessageContact',
                phone_number,
                first_name,
                last_name: options.last_name || ''
            }
        }
        return this._sendMessage(chat_id, media, options)
    }

    async sendChatAction(chat_id, action) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            action: await this.conversion.buildTdlibChatAction(action)
        }
        let ret = await this.run('sendChatAction', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async getUserProfilePhotos(user_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let opt = {
            user_id,
            offset: options.offset || 0,
            limit: options.limit || 100
        }
        let ret = await this.run('getUserProfilePhotos', opt)
        return this.conversion.buildUserProfilePhotos(ret)
    }

    async kickChatMember(chat_id, user_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            user_id,
            status: {
                '@type': options.kick_only ? 'chatMemberStatusLeft' : 'chatMemberStatusBanned'
            }
        }
        if (options.until_date && !options.kick_only) {
            opt.status.banned_until_date = options.until_date
        }
        let ret = await this.run('setChatMemberStatus', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async unbanChatMember(chat_id, user_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            user_id,
            status: {
                '@type': 'chatMemberStatusLeft'
            }
        }
        let ret = await this.run('setChatMemberStatus', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async restrictChatMember(chat_id, user_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            user_id,
            status: {
                '@type': 'chatMemberStatusRestricted',
            }
        }
        if (options.until_date) {
            opt.status.restricted_until_date = options.until_date
        }
        if ('can_send_message' in options) opt.status.can_send_messages = options.can_send_messages
        if ('can_send_media_messages' in options) opt.status.can_send_media_messages = options.can_send_media_messages
        if ('can_send_other_messages' in options) opt.status.can_send_other_messages = options.can_send_other_messages
        if ('can_add_web_page_previews' in options) opt.status.can_add_web_page_previews = options.can_add_web_page_previews

        let ret = await this.run('setChatMemberStatus', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async promoteChatMember(chat_id, user_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            user_id,
            status: {
                '@type': 'chatMemberStatusAdministrator',
            }
        }
        if ('can_change_info' in options) opt.status.can_change_info = options.can_change_info
        if ('can_post_messages' in options) opt.status.can_post_messages = options.can_post_messages
        if ('can_edit_messages' in options) opt.status.can_edit_messages = options.can_edit_messages
        if ('can_delete_messages' in options) opt.status.can_delete_messages = options.can_delete_messages
        if ('can_invite_users' in options) opt.status.can_invite_users = options.can_invite_users
        if ('can_restrict_members' in options) opt.status.can_restrict_members = options.can_restrict_members
        if ('can_pin_messages' in options) opt.status.can_pin_messages = options.can_pin_messages
        if ('can_promote_members' in options) opt.status.can_promote_members = options.can_promote_members

        let ret = await this.run('setChatMemberStatus', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async exportChatInviteLink(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id
        }
        let ret = await this.run('generateChatInviteLink', opt)
        return ret.invite_link
    }

    async setChatPhoto(chat_id, photo) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            photo: this._prepareUploadFile(photo)
        }
        let ret = await this.run('setChatPhoto', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async deleteChatPhoto(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            photo: this._prepareUploadFile(0)
        }
        let ret = await this.run('setChatPhoto', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async setChatTitle(chat_id, title) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            title
        }
        let ret = await this.run('setChatTitle', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async setChatDescription(chat_id, description) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        if (chat_id > -Math.pow(10, 12)) throw new Error('Not a supergroup or channel.')
        await this._initChatIfNeeded(chat_id)
        let opt = {
            supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
            description
        }
        let ret = await this.run('setSupergroupDescription', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async pinChatMessage(chat_id, message_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        if (chat_id > -Math.pow(10, 12)) throw new Error('Not a supergroup or channel.')
        await this._initChatIfNeeded(chat_id)
        message_id = _util.get_tdlib_message_id(message_id)
        let opt = {
            supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
            message_id,
            disable_notification: !!options.disable_notification
        }
        let ret = await this.run('pinSupergroupMessage', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async unpinChatMessage(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        if (chat_id > -Math.pow(10, 12)) throw new Error('Not a supergroup or channel.')
        await this._initChatIfNeeded(chat_id)
        let opt = {
            supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
        }
        let ret = await this.run('uninSupergroupMessage', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async leaveChat(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let me = await this.run('getMe', {})
        let opt = {
            chat_id,
            user_id: me.id,
            status: {
                '@type': 'chatMemberStatusLeft'
            }
        }
        let ret = await this.run('setChatMemberStatus', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async getUser(user_id) {
        if (!this.ready) throw new Error('Not ready.')
        return this._getUser(user_id)
    }

    async getChat(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        return this._getChat(chat_id, true)
    }

    async getChatAdministrators(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id
        }
        if (chat_id < -Math.pow(10, 12)) {
            let supergroup_id = Math.abs(chat_id) - Math.pow(10, 12)
            let admin_members = await this.run('getSupergroupMembers', {
                supergroup_id,
                filter: {
                    '@type': 'supergroupMembersFilterAdministrators'
                },
                offset: 0,
                limit: 200
            })
            let admins = []
            for (let a of admin_members.members) {
                admins.push(await this.conversion.buildChatMember(a))
            }
            return admins
        } else if (chat_id < 0) {
            let ret = await this.run('getChatAdministrators', opt)
            let admins = []
            for (let a of ret.user_ids) {
                let member = await this._getChatMember(chat_id, a)
                admins.push(member)
            }
            return admins
        } else {
            throw new Error('Not a chat')
        }
    }

    async getChatMembersCount(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let chat = await this.run('getChat', {
            chat_id
        })
        if (chat.type['@type'] == 'chatTypeSupergroup') {
            let additional_full = await this.run('getSupergroupFullInfo', {
                supergroup_id: chat.type.supergroup_id
            })
            return additional_full.member_count
        } else if (chat.type['@type'] == 'chatTypeBasicGroup') {
            let additional = await this.run('getBasicGroup', {
                basic_group_id: chat.type.basic_group_id
            })
            return additional.member_count
        } else if (chat.type['@type'] == 'chatTypePrivate') {
            throw new Error('Not a group or a channel.')
        } else {
            throw new Error('Unknown Chat Type.')
        }
    }

    async getChatMember(chat_id, user_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        return this._getChatMember(chat_id, user_id)
    }

    async setChatStickerSet(chat_id, sticker_set) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let pack_id
        if (isNaN(sticker_set)) {
            // is Name
            pack_id = await this.run('searchStickerSet', {
                sticker_set
            })
            pack_id = pack_id.id
        } else {
            // is ID
            pack_id = sticker_set
        }

        let opt = {
            supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
            sticker_set_id: pack_id
        }

        let ret = await this.run('setSupergroupStickerSet', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async deleteChatStickerSet(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
            sticker_set_id: 0
        }

        let ret = await this.run('setSupergroupStickerSet', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async answerCallbackQuery(callback_query_id, options = {}) {
        /* The older method signature (in/before v0.27.1) was answerCallbackQuery(callbackQueryId, text, showAlert).
         * We need to ensure backwards-compatibility while maintaining
         * consistency of the method signatures throughout the library */
        if (typeof options !== 'object') {
            options = {
                callback_query_id: arguments[0],
                text: arguments[1],
                show_alert: arguments[2],
            };
        }
        /* The older method signature (in/before v0.29.0) was answerCallbackQuery([options]).
         * We need to ensure backwards-compatibility while maintaining
         * consistency of the method signatures throughout the library. */
        if (typeof callback_query_id === 'object') {
            options = callback_query_id
        } else {
            options.callback_query_id = callback_query_id
        }
        let ret = await this.run('answerCallbackQuery', options)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async editMessageText(text, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (options.chat_id && options.message_id) {
            options.chat_id = await this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = await this.run('getMessage', {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id)
            })
            if (orig_msg.content['@type'] != 'messageText') throw new Error('Target message is not a text message.')
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
                input_message_content: {
                    '@type': 'inputMessageText',
                    text: await this._generateFormattedText(text, options.parse_mode),
                    disable_web_page_preview: !!options.disable_web_page_preview
                }
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            } else if (options.preserve_reply_markup) {
                if (orig_msg.reply_markup) {
                    _opt.reply_markup = orig_msg.reply_markup
                }
            }
            let ret = await this.run('editMessageText', _opt)
            return this.conversion.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
                input_message_content: {
                    '@type': 'inputMessageText',
                    text: await this._generateFormattedText(text, options.parse_mode),
                    disable_web_page_preview: !!options.disable_web_page_preview
                }
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            }
            let ret = await this.run('editInlineMessageText', _opt)
            if (ret['@type'] == 'ok')
                return true
            else throw ret
        } else {
            throw new Error('Please specify chat_id and message_id or inline_message_id.')
        }
    }

    async editMessageCaption(caption, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (options.chat_id && options.message_id) {
            options.chat_id = await this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = await this.run('getMessage', {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id)
            })
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
                caption: await this._generateFormattedText(caption, options.parse_mode)
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            } else if (options.preserve_reply_markup) {
                if (orig_msg.reply_markup) {
                    _opt.reply_markup = orig_msg.reply_markup
                }
            }
            let ret = await this.run('editMessageCaption', _opt)
            return this.conversion.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
                caption: await this._generateFormattedText(caption, options.parse_mode)
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            }
            let ret = await this.run('editInlineMessageCaption', _opt)
            if (ret['@type'] == 'ok')
                return true
            else throw ret
        } else {
            throw new Error('Please specify chat_id and message_id or inline_message_id.')
        }
    }

    async editMessageMedia(media, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (options.chat_id && options.message_id) {
            options.chat_id = await this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = await this.run('getMessage', {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id)
            })
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
                input_message_content: await this.conversion.buildTdlibMedia(media)
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            } else if (options.preserve_reply_markup) {
                if (orig_msg.reply_markup) {
                    _opt.reply_markup = orig_msg.reply_markup
                }
            }
            let ret = await this.run('editMessageMedia', _opt)
            return this.conversion.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
                input_message_content: await this.conversion.buildTdlibMedia(media)
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            }
            let ret = await this.run('editInlineMessageMedia', _opt)
            if (ret['@type'] == 'ok')
                return true
            else throw ret
        } else {
            throw new Error('Please specify chat_id and message_id or inline_message_id.')
        }
    }

    async editMessageReplyMarkup(reply_markup, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (options.chat_id && options.message_id) {
            options.chat_id = await this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
            }

            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            }
            let ret = await this.run('editMessageReplyMarkup', _opt)
            return this.conversion.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
            }
            let ret = await this.run('editInlineMessageReplyMarkup', _opt)
            if (ret['@type'] == 'ok')
                return true
            else throw ret
        } else {
            throw new Error('Please specify chat_id and message_id or inline_message_id.')
        }
    }

    async deleteMessage(chat_id, message_ids) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        if (!Array.isArray(message_ids)) message_ids = [message_ids]
        message_ids = message_ids.map((id) => _util.get_tdlib_message_id(id))
        let _opt = {
            chat_id,
            message_ids,
            revoke: true
        }
        let ret = await this.run('deleteMessages', _opt)
        if (ret['@type'] == 'ok')
            return true
    }

    async sendSticker(chat_id, sticker, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageSticker',
            sticker: await this._prepareUploadFile(sticker)
        }
        return this._sendMessage(chat_id, media, options)
    }

    async getStickerSet(name) {
        if (!this.ready) throw new Error('Not ready.')
        let pack
        if (isNaN(name)) {
            // is Name
            pack = await this.run('searchStickerSet', {
                name
            })
        } else {
            // is ID
            pack = await this.run('getStickerSet', {
                set_id: name
            })
        }
        return this.conversion.buildStickerSet(pack)
    }

    async uploadStickerFile(user_id, png_sticker) {
        if (!this.ready) throw new Error('Not ready.')
        let opt = {
            user_id,
            png_sticker: await this._prepareUploadFile(png_sticker)
        }
        let ret = await this.run('uploadStickerFile', opt)
        return this.conversion.buildFile(ret)
    }

    // incompability
    async createNewStickerSet(user_id, name, title, stickers, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let opt = {
            user_id,
            name,
            title,
            is_masks: !!options.contains_masks
        }
        let stks = []
        for (let st of stickers) {
            stks.push({
                png_sticker: await this._prepareUploadFile(st.png_sticker),
                emojis: st.emojis,
                mask_position: await this.conversion.buildTdlibMaskPosition(st.mask_position)
            })
        }
        opt.stickers = stks
        let ret = await this.run('createNewStickerSet', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async addStickerToSet(user_id, name, png_sticker, emojis, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let opt = {
            user_id,
            name,
            sticker: {
                png_sticker: await this._prepareUploadFile(png_sticker),
                emojis: emojis
            }
        }
        if (options.mask_position) {
            opt.sticker.mask_position = await this.conversion.buildTdlibMaskPosition(options.mask_position)
        }
        let ret = await this.run('addStickerToSet', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async setStickerPositionInSet(sticker, position) {
        if (!this.ready) throw new Error('Not ready.')
        let opt = {
            sticker: await this._prepareUploadFile(sticker),
            position
        }
        if (opt.sticker['@type'] != 'inputFileRemote') throw new Error('Only sticker file_id is acceptable.')
        let ret = await this.run('setStickerPositionInSet', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async deleteStickerFromSet(sticker) {
        if (!this.ready) throw new Error('Not ready.')
        let opt = {
            sticker: await this._prepareUploadFile(sticker),
        }
        if (opt.sticker['@type'] != 'inputFileRemote') throw new Error('Only sticker file_id is acceptable.')
        let ret = await this.run('removeStickerFromSet', opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async answerInlineQuery(inline_query_id, results, options = {}) {
        options.inline_query_id = inline_query_id
        options.results = []
        for (let iqr of results) {
            options.results.push(await this.conversion.buildTdlibInlineQueryResult(iqr))
        }
        let ret = await this.run('answerInlineQuery', options)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async sendInvoice(chat_id, title, description, payload, provider_token, start_parameter, currency, prices, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessageInvoice',
            title,
            description,
            payload,
            provider_token,
            start_parameter,
            invoice: {
                currency,
                price_parts: [],
                need_name: !!options.need_name,
                need_phone_number: !!options.need_phone_number,
                need_email_address: !!options.need_email,
                need_shipping_address: !!options.need_shipping_address,
                send_phone_number_to_provider: !!options.send_phone_number_to_provider,
                send_email_address_to_provider: !!options.send_email_to_provider,
                is_flexible: !!options.is_flexible
            }
        }
        for (let pp of prices) {
            media.invoice.price_parts.push(pp)
        }
        if (provider_token.match(/:TEST:/)) {
            media.invoice.is_test = true
        }
        if (options.photo_url)
            media.photo_url = options.photo_url
        if (options.photo_size)
            media.photo_size = options.photo_size
        if (options.photo_width)
            media.photo_width = options.photo_width
        if (options.photo_height)
            media.photo_height = options.photo_height
        if (options.provider_data)
            media.provider_data = options.provider_data
        return this._sendMessage(chat_id, media, options)
    }

    async answerShippingQuery(shipping_query_id, ok, options = {}) {
        let _opt = {
            shipping_query_id,
            shipping_options: []
        }
        if (ok) {
            _opt.error_message = ''
            for (let so of options.shipping_options) {
                _opt.shipping_options.push({
                    id: so.id,
                    title: so.title,
                    price_parts: so.prices
                })
            }
        } else if (!options.error_message) {
            throw new Error('When ok is false, you must specify error message.')
        } else {
            _opt.error_message = options.error_message
        }
        let ret = await this.run('answerShippingQuery', _opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async answerPreCheckoutQuery(pre_checkout_query_id, ok, options = {}) {
        let _opt = {
            pre_checkout_query_id
        }
        if (ok) {
            _opt.error_message = ''
        } else if (!options.error_message) {
            throw new Error('When ok is false, you must specify error message.')
        } else {
            _opt.error_message = options.error_message
        }
        let ret = await this.run('answerPreCheckoutQuery', _opt)
        if (ret['@type'] == 'ok') return true
        else throw ret
    }

    async getFile(file_id, priority = 1) {
        let self = this
        let _id = file_id
        if (isNaN(file_id)) {
            let _file = await self.run('getRemoteFile', {
                remote_file_id: _id
            })
            _id = _file.id
        } else {
            _id = parseInt(_id)
        }
        if (priority < 1) priority = 1
        if (priority > 32) priority = 32
        return new Promise((rs, rj) => {
            self.once(`file_downloaded_${_id}`, file => {
                return rs({
                    file_id: file.id,
                    file_size: file.size,
                    file_path: file.local.path
                })
            })
            self.run('downloadFile', {
                file_id: _id,
                priority
            }).catch(rj)
        })
    }

    async deleteFile(file_id) {
        let _id = file_id
        if (isNaN(file_id)) {
            let _file = await this.run('getRemoteFile', {
                remote_file_id: _id
            })
            _id = _file.id
        } else {
            _id = parseInt(_id)
        }
        let ret = await this.run('deleteFile', {file_id: _id})
        if (ret['@type'] == 'ok')
            return true
        else throw ret
    }

    // Helpers

    async _getUser(user_id, out_full = true) {
        let _id = await this._checkChatId(user_id)
        if (_id <= 0) throw new Error('Not a user.')
        let user = await this.run('getUser', {
            user_id: _id
        })

        return this.conversion.buildUser(user, out_full)
    }

    async _getChat(chat_id, out_full = true) {
        let _id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(_id)
        let chat = await this.run('getChat', {
            chat_id: _id
        })
        return this.conversion.buildChat(chat, out_full)
    }

    // Note: it use API id. Don't forget to convert
    async _getMessageByAPIId(chat_id, message_id, follow_replies_level) {
        let _mid = _util.get_tdlib_message_id(message_id)
        return this._getMessageByTdlibId(chat_id, _mid, follow_replies_level)
    }

    async _getMessageByTdlibId(chat_id, message_id, follow_replies_level) {
        let _msg = await this.run('getMessage', {
            chat_id,
            message_id
        })
        return this._getMessage(_msg, follow_replies_level)
    }

    async _getChatMember(chat_id, user_id) {
        chat_id = await this._checkChatId(chat_id)
        user_id = await this._checkChatId(user_id)
        let cm = await this.run('getChatMember', {
            chat_id,
            user_id
        })
        return this.conversion.buildChatMember(cm)
    }

    async _getMessage(message, follow_replies_level) {
        return this.conversion.buildMessage(message, follow_replies_level)
    }

    async _generateFormattedText(text, parse_mode) {
        text = text.toString()
        if (parse_mode) {
            let parser
            switch (parse_mode) {
                case "Markdown":
                    parser = 'textParseModeMarkdown'
                    break
                case "HTML":
                    parser = 'textParseModeHTML'
                    break
            }
            if (parser) {
                return this.run('parseTextEntities', {
                    text,
                    parse_mode: {
                        '@type': parser
                    }
                })
            } else {
                return {
                    text
                }
            }
        } else {
            return {
                text
            }
        }
    }

    async _checkChatId(chat_id) {
        if (isNaN(chat_id)) {
            if (typeof chat_id != 'string') {
                throw new Error('chat_id is not a string nor number: ' + chat_id)
            }
            try {
                return (await this.run('searchPublicChat', {
                    username: chat_id.match(/^@?([a-zA-Z0-9_]+)$/)[0]
                })).id
            } catch (e) {
                throw new Error('cannot resolve name: ' + chat_id)
            }
        } else {
            return parseInt(chat_id)

        }
    }

    async _prepareUploadFile(file, file_name = null) {
        // File can be instance of Stream, Buffer or String(remote.id) or String(local_path)
        if (file instanceof stream.Stream) {
            return new Promise((rs, rj) => {
                // TODO: find a way to set file metas
                // Issue: https://github.com/tdlib/td/issues/290
                let file_path = _util.generateTempFileLocation(this._identifier)
                let write_stream = fs.createWriteStream(file_path)
                write_stream.on('error', rj)
                write_stream.on('finish', () => {
                    if (file_name) {
                        return rs({
                            '@type': 'inputFileGenerated',
                            original_path: path.join(file_path, file_name),
                            conversion: '#copy_rename_remove#',
                            expected_size: 0
                        })
                    } else {
                        return rs({
                            '@type': 'inputFileGenerated',
                            original_path: file_path,
                            conversion: '#temp_file#',
                            expected_size: 0
                        })
                    }
                })
                file.pipe(write_stream)
            })
        } else if (Buffer.isBuffer(file)) {
            let file_path = _util.generateTempFileLocation(this._identifier)
            await fsp.writeFile(file_path, file)
            if (file_name) {
                return {
                    '@type': 'inputFileGenerated',
                    original_path: path.join(file_path, file_name),
                    conversion: '#copy_rename_remove#',
                    expected_size: 0
                }
            } else {
                return {
                    '@type': 'inputFileGenerated',
                    original_path: file_path,
                    conversion: '#temp_file#',
                    expected_size: 0
                }
            }
        } else if (isNaN(file)) {
            if (file.match(/^http:\/\/|^https:\/\//)) {
                return {
                    '@type': 'inputFileGenerated',
                    original_path: file,
                    conversion: '#url#'
                }
            } else if (await _util.fileExists(file)) {
                return {
                    '@type': 'inputFileLocal',
                    path: path.resolve(file)
                }
            } else {
                return {
                    '@type': 'inputFileRemote',
                    id: file
                }
            }
        } else {
            return {
                '@type': 'inputFileId',
                id: file
            }
        }
    }

    async _sendMessage(chat_id, content, options = {}) {
        let self = this
        chat_id = await this._checkChatId(chat_id)
        let opt = {
            chat_id,
            reply_to_message_id: _util.get_tdlib_message_id(options.reply_to_message_id || 0),
            disable_notification: !!options.disable_notification,
            from_background: true,
            input_message_content: content
        }
        if (options.reply_markup) {
            opt.reply_markup = _util.parseReplyMarkup(options.reply_markup, this._encrypt_callback_query)
        }
        await self._initChatIfNeeded(chat_id)
        let old_msg = await self.run('sendMessage', opt)
        return new Promise(async (rs, rj) => {
            self.once(`_msgSent:${old_msg.id}`, async (update) => {
                rs(this._getMessage(update.message))
            })
            this.once(`_msgFail:${old_msg.id}`, async (update) => {
                rj(update)
            })
        })
    }

    async _sendMessageAlbum(chat_id, contents, options = {}) {
        let self = this
        chat_id = await this._checkChatId(chat_id)
        let opt = {
            chat_id,
            reply_to_message_id: _util.get_tdlib_message_id(options.reply_to_message_id || 0),
            disable_notification: !!options.disable_notification,
            from_background: true,
            input_message_contents: contents
        }
        await self._initChatIfNeeded(chat_id)
        let old_msg = await self.run('sendMessageAlbum', opt)
        return new Promise(async (rs, rj) => {
            self.once(`_msgSent:${old_msg.id}`, async (update) => {
                let msgs = []
                for (let m of update.messages) {
                    msgs.push(await this._getMessage(m))
                }
                rs(msgs)
            })
            this.once(`_msgFail:${old_msg.id}`, async (update) => {
                rj(update)
            })
        })
    }

    async _processIncomingUpdate(message) {
        if (message.is_outgoing) return
        let msg = await this._getMessage(message)
        if (message.is_channel_post) {
            return this.emit('channel_post', msg)
        } else {
            return this.emit('message', msg)
        }
    }

    async _processIncomingEdit(update) {
        let _msg = await this.run('getMessage', {
            chat_id: update.chat_id,
            message_id: update.message_id
        })
        if (_msg.is_outgoing) return
        let msg = await this._getMessage(_msg)
        if (_msg.is_channel_post) {
            return this.emit('edited_channel_post', msg)
        } else {
            return this.emit('edited_message', msg)
        }
    }

    async _processIncomingCallbackQuery(update) {
        let _from = await this._getUser(update.sender_user_id, false)
        let evt = {
            id: update.id,
            from: _from,
            chat_instance: update.chat_instance,
        }
        if (update.chat_id && update.message_id) {
            try {
                evt.message_id = _util.get_api_message_id(update.message_id)
                evt.message = await this._getMessageByTdlibId(update.chat_id, update.message_id)
            } catch (e) {
                // ignore
            }
        } else if (update.inline_message_id) {
            evt.inline_message_id = update.inline_message_id
        }
        switch (update.payload['@type']) {
            case 'callbackQueryPayloadData':
                if (this._encrypt_callback_query) {
                    let payload = Buffer.from(update.payload.data, 'base64')
                    let magic = payload.slice(0, 2)
                    if (magic.equals(Buffer.from('0f0f', 'hex'))) {
                        let decryptor = crypto.createDecipheriv('aes-256-cfb', this._encrypt_callback_query, '0000000000000000')
                        evt.data = Buffer.concat([decryptor.update(payload.slice(2)), decryptor.final()]).toString('utf8')
                    } else {
                        // magic not found
                        evt.data = payload.toString('utf8')
                    }
                } else {
                    evt.data = Buffer.from(update.payload.data, 'base64').toString('utf8')
                }
                break
            case 'callbackQueryPayloadGame':
                evt.game_short_name = update.payload.game_short_name
                break
        }
        return this.emit('callback_query', evt)
    }

    async _processIncomingInlineQuery(update) {
        let _from = await this._getUser(update.sender_user_id, false)
        let evt = {
            id: update.id,
            from: _from,
            query: update.query,
            offset: update.offset
        }
        if (update.user_location) {
            evt.location = await this.conversion.buildLocation(update.user_location)
        }
        return this.emit('inline_query', evt)
    }

    async _processIncomingChosenInlineResult(update) {
        let _from = await this._getUser(update.sender_user_id, false)
        let evt = {
            result_id: update.result_id,
            from: _from,
            query: update.query,
            offset: update.offset
        }
        if (update.user_location) {
            evt.location = await this.conversion.buildLocation(update.user_location)
        }
        return this.emit('chosen_inline_result', evt)
    }

    async _initChatIfNeeded(chat_id) {
        // See https://github.com/tdlib/td/issues/263#issuecomment-395968079
        if (this._inited_chat.has(chat_id)) return
        try {
            await this.run('getChat', {
                chat_id
            })
        } catch (e) {
            if (chat_id < -Math.pow(10, 12)) {
                await this.run('getSupergroup', {
                    supergroup_id: Math.abs(chat_id) - Math.pow(10, 12)
                })
                await this.run('createSupergroupChat', {
                    supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
                    force: false
                })
            } else if (chat_id < 0) {
                await this.run('getBasicGroup', {
                    basic_group_id: Math.abs(chat_id)
                })
                await this.run('createBasicGroupChat', {
                    basic_group_id: Math.abs(chat_id),
                    force: false
                })
            } else {
                await this.run('getUser', {
                    user_id: chat_id
                })
                await this.run('createPrivateChat', {
                    user_id: chat_id,
                    force: false
                })
            }
        }
        this._inited_chat.add(chat_id)
        return
    }
}

module.exports = Bot
