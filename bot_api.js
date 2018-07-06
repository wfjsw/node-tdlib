// https://core.telegram.org/bots/api

const stream = require('stream')
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const lib = require('./td_client_actor')
const _util = require('./util')

lib.td_set_log_verbosity_level(2)

class Bot extends lib.TdClientActor {
    constructor(api_id, api_hash, bot_token, use_test_dc = false, identifier = null) {
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
        let self = this
        this.ready = false
        this._inited_chat = new Set()
        if (bot_token) {
            this.on('__updateAuthorizationState', (update) => {
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
        this.once('ready', () => this.ready = true)
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

    async forwardMessage(chat_id, from_chat_id, message_ids, { disable_notification }) {
        if (!this.ready) throw new Error('Not ready.')
        if (!Array.isArray(message_ids)) message_ids = [message_ids]
        chat_id = await this._checkChatId(chat_id)
        from_chat_id = await this._checkChatId(from_chat_id)
        message_ids = message_ids.map((id) => _util.get_tdlib_message_id(id))
        let opt = {
            chat_id,
            from_chat_id,
            disable_notification: !!disable_notification,
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

    async sendPhoto(chat_id, photo, options = {}, { file_name }) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessagePhoto',

        }
        if (options.caption)
            media.caption = await this._generateFormattedText(options.caption, options.parse_mode)
        return this._sendMessage(chat_id, media, options)
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
            options.chat_id = this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = this.run('getMessage', {
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
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
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
                location: {
                    latitude,
                    longitude
                }
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
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
            options.chat_id = this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = this.run('getMessage', {
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
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
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
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
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

    async sendVenue(chat_id, phone_number, first_name, options = {}) {
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

    async sendChatAction(chat_id, action, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            action: await this.conversion.buildTdlibChatAction(action)
        }
        let ret = await this.run('sendChatAction', opt)
        if (ret['@type'] = 'ok') return true
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

    // getFile - ?????????

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
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async unbanChatMember(chat_id, user_id, options = {}) {
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
        if (ret['@type'] = 'ok') return true
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
        if (ret['@type'] = 'ok') return true
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
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async exportChatInviteLink(chat_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id
        }
        let ret = await this.run('generateChatInviteLink', opt)
        return ret.invite_link
    }

    async setChatPhoto(chat_id, photo, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            photo: this._prepareUploadFile(photo)
        }
        let ret = await this.run('setChatPhoto', opt)
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async deleteChatPhoto(chat_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            photo: this._prepareUploadFile(0)
        }
        let ret = await this.run('setChatPhoto', opt)
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async setChatTitle(chat_id, title, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let opt = {
            chat_id,
            title
        }
        let ret = await this.run('setChatTitle', opt)
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async setChatDescription(chat_id, description, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        if (chat_id > -Math.pow(10, 12)) throw new Error('Not a supergroup or channel.')
        await this._initChatIfNeeded(chat_id)
        let opt = {
            supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
            description
        }
        let ret = await this.run('setSupergroupDescription', opt)
        if (ret['@type'] = 'ok') return true
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
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async unpinChatMessage(chat_id, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        if (chat_id > -Math.pow(10, 12)) throw new Error('Not a supergroup or channel.')
        await this._initChatIfNeeded(chat_id)
        let opt = {
            supergroup_id: Math.abs(chat_id) - Math.pow(10, 12),
        }
        let ret = await this.run('uninSupergroupMessage', opt)
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async leaveChat(chat_id, options = {}) {
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
        if (ret['@type'] = 'ok') return true
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
        let ret = await this.run('getChatAdministrators', opt)
        let admins = []
        for (let a of ret.user_ids) {
            admins.push(await this._getChatMember(chat_id, a))
        }
        return admins
    }

    async getChatMembersCount(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        let chat = await this._getChat(chat_id, false)
        return chat.member_count
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
        if (ret['@type'] = 'ok') return true
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
        if (ret['@type'] = 'ok') return true
        else throw ret
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

    async answerCallbackQuery(callback_query_id, options = {}) {
        options.callback_query_id = callback_query_id
        let ret = await this.run('answerCallbackQuery', options)
        if (ret['@type'] = 'ok') return true
        else throw ret
    }

    async editMessageText(text, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (options.chat_id && options.message_id) {
            options.chat_id = this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = this.run('getMessage', {
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
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
            } else if (options.preserve_reply_markup) {
                if (orig_msg.reply_markup) {
                    _opt.reply_markup = orig_msg.reply_markup
                }
            }
            let ret = await this.run('editMessageText', _opt)
            return _util.buildMessage(ret)
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
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
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
            options.chat_id = this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let orig_msg = this.run('getMessage', {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id)
            })
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
                caption: await this._generateFormattedText(caption, options.parse_mode)
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
            } else if (options.preserve_reply_markup) {
                if (orig_msg.reply_markup) {
                    _opt.reply_markup = orig_msg.reply_markup
                }
            }
            let ret = await this.run('editMessageCaption', _opt)
            return _util.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
                caption: await this._generateFormattedText(caption, options.parse_mode)
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
            }
            let ret = await this.run('editInlineMessageCaption', _opt)
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
            options.chat_id = this._checkChatId(options.chat_id)
            await this._initChatIfNeeded(options.chat_id)
            let _opt = {
                chat_id: options.chat_id,
                message_id: _util.get_tdlib_message_id(options.message_id),
            }

            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
            }
            let ret = await this.run('editMessageReplyMarkup', _opt)
            return _util.buildMessage(ret)
        } else if (options.inline_message_id) {
            let _opt = {
                inline_message_id: options.inline_message_id,
            }
            if (options.reply_markup) {
                _opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
            }
            let ret = await this.run('editInlineMessageReplyMarkup', _opt)
            if (ret['@type'] == 'ok')
                return true
            else throw ret
        } else {
            throw new Error('Please specify chat_id and message_id or inline_message_id.')
        }
    }

    async deleteMessage(chat_id, message_ids, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        chat_id = this._checkChatId(chat_id)
        await this._initChatIfNeeded(chat_id)
        if (!Array.isArray(message_ids)) message_ids = [message_ids]
        message_ids = message_ids.map((id) => _util.get_tdlib_message_id(id))
        let _opt = {
            chat_id: options.chat_id,
            message_ids,
            revoke: true
        }
        let ret = await this.run('deleteMessages', _opt)
        if (ret['@type'] == 'ok')
            return true
    }

    /*async answerInlineQuery(inline_query_id, results, options = {}) {
        options.callback_query_id = callback_query_id
        let ret = await this.run('answerCallbackQuery', options)
        if (ret['@type'] = 'ok') return true
        else throw ret
    }*/

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
    async _getMessageById(chat_id, message_id) {
        let _mid = _util.get_tdlib_message_id(message_id)
        let _msg = await this.run('getMessage', {
            chat_id,
            message_id: _mid
        })
        return this._getMessage(_msg)
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
        if (isNaN(chat_id))
            return (await this.run('searchPublicChat', {
                username: chat_id.match(/^[@]{0,1}([a-zA-Z0-9_]+)$/)[0]
            })).id
        else
            return chat_id
    }

    async _prepareUploadFile(file, file_name = null) {
        // File can be instance of Stream, Buffer or String(remote.id) or String(local_path)
        if (file instanceof stream.Stream) {
            return new Promise((rs, rj) => {
                // TODO: find a way to set file metas
                // Issue: https://github.com/tdlib/td/issues/290
                let file_path = _util.generateTempFileLocation(this._instance_id)
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
                            '@type': 'inputFileLocal',
                            path: file_path
                        })
                    }
                })
                file.pipe(write_stream)
            })
        } else if (Buffer.isBuffer(file)) {
            let file_path = _util.generateTempFileLocation(this._instance_id)
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
                    '@type': 'inputFileLocal',
                    path: file_path
                }
            }
        } else if (isNaN(file)) {
            if (await _util.fileExists(file)) {
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
            opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
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

    async _processIncomingUpdate(message) {
        if (message.is_outgoing) return
        let msg = await this._getMessage(message)
        this.emit('message', msg)
        console.log(msg)
    }

    async _processIncomingEdit(update) {
        let _msg = await this.run('getMessage', {
            chat_id: update.chat_id,
            message_id: update.message_id
        })
        if (_msg.is_outgoing) return
        let msg = await this._getMessage(_msg)
        this.emit('edited_message', msg)
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
