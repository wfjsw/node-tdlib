// https://core.telegram.org/bots/api

let lib = require('./td_client_actor')
let _util = require('./util')

lib.td_set_log_verbosity_level(2)

class Bot extends lib.TdClientActor {
    constructor(api_id, api_hash, bot_token, use_test_dc = false, identifier = null) {
        if (!api_id || !api_hash || !bot_token) throw new Error('missing api_id, api_hash or bot_token')
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
        this.on('updateAuthorizationState', (update) => {
            switch (update.authorization_state['@type']) {
                case 'authorizationStateWaitPhoneNumber':
                    return this.run('checkAuthenticationBotToken', {
                        token: bot_token
                    })
            }
        })
        this.on('updateMessageSendSucceeded', (update) => {
            this.emit(`_msgSent:${update.old_message_id}`, update)
        })
        this.on('updateMessageSendFailed', (update) => {
            this.emit(`_msgFail:${update.old_message_id}`, update)
        })
        this.on('updateNewMessage', (update) => {
            this._processIncomingUpdate.call(self, update.message)
        })
        this.once('ready', () => this.ready = true)
    }

    async getMe() {
        if (!this.ready) throw new Error('Not ready.')
        let me = await this.run('getMe', {})
        let me_full = await this.run('getUserFullInfo', {
            user_id: me.id
        })
        return _util.buildBotApiUser(me, me_full)
    }

    async sendMessage(chat_id, text, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let self = this
        chat_id = await this._checkChatId(chat_id)
        let opt = {
            chat_id,
            reply_to_message_id: options.reply_to_message_id || 0,
            disable_notification: !!options.disable_notification,
            from_background: true
        }
        if (options.reply_markup) {
            opt.reply_markup = _util.parseReplyMarkup(options.reply_markup)
        }
        opt.input_message_content = {
            '@type': 'inputMessageText',
            disable_web_page_preview: !!options.disable_web_page_preview
        }
        opt.input_message_content.text = await self._generateFormattedText(text, options.parse_mode)
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

    async forwardMessage(chat_id, from_chat_id, message_ids, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (!Array.isArray(message_ids)) message_ids = [message_ids]
        chat_id = await this._checkChatId(chat_id)
        from_chat_id = await this._checkChatId(from_chat_id)
        message_ids = message_ids.map((id) => _util.get_tdlib_message_id(id))
        let opt = {
            chat_id,
            from_chat_id,
            disable_notification: !!options.disable_notification,
            from_background: true
        }
        await this._initChatIfNeeded(chat_id)
        await this._initChatIfNeeded(from_chat_id)
        return this.run('forwardMessages', opt)
    }

    async sendPhoto(chat_id, photo, options = {}, file_options = {}) {
        if (!this.ready) throw new Error('Not ready.')


    }

    async getUser(user_id) {
        if (!this.ready) throw new Error('Not ready.')
        return this._getUser(user_id)
    }

    async getChat(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        return this._getUser(chat_id, false, true)
    }

    // Helpers

    async _getUser(user_id, out_full = true) {
        let _id = await this._checkChatId(user_id)
        if (_id <= 0) throw new Error('Not a user.')
        let user, userfull
        user = await this.run('getUser', {
            user_id: _id
        })
        if (out_full)
            userfull = await this.run('getUserFullInfo', {
                user_id: _id
            })
        return _util.buildBotApiUser(user, userfull)
    }

    async _getChat(chat_id, internal_call = false, out_full = true) {
        if (!this.ready) throw new Error('Not ready.')
        let _id = await this._checkChatId(chat_id)
        await this._initChatIfNeeded(_id)
        let chat = await this.run('getChat', {
            chat_id: _id
        })
        let additional, additional_full, sticker_set, pin_msg
        if (chat.type['@type'] == 'chatTypeSupergroup') {
            additional = await this.run('getSupergroup', {
                supergroup_id: chat.type.supergroup_id
            })
            if (out_full) {
                try {
                    additional_full = await this.run('getSupergroupFullInfo', {
                        supergroup_id: chat.type.supergroup_id
                    })
                    if (additional_full.pinned_message_id && !internal_call) {
                        let pin_msg_orig = await this.run('getMessage', {
                            chat_id: chat.id,
                            message_id: additional_full.pinned_message_id
                        })
                        pin_msg = await this._getMessage(pin_msg_orig, true)
                        console.log(pin_msg)
                        debugger
                    }
                    if (additional_full.sticker_set_id != "0")
                        sticker_set = await this.run('getStickerSet', {
                            set_id: additional_full.sticker_set_id
                        })
                } catch (e) {
                    console.error(e)
                }
            }
        } else if (chat.type['@type'] == 'chatTypeBasicGroup') {
            additional = await this.run('getBasicGroup', {
                basic_group_id: chat.type.basic_group_id
            })
            if (out_full)
                additional_full = await this.run('getBasicGroupFullInfo', {
                    basic_group_id: chat.type.basic_group_id
                })
        } else if (chat.type['@type'] == 'chatTypePrivate') {
            additional = await this.run('getUser', {
                user_id: chat.type.user_id
            })
            if (out_full)
                additional_full = await this.run('getUserFullInfo', {
                    user_id: chat.type.user_id
                })
        } else {
            throw new Error('Unknown Chat Type.')
        }
        return _util.buildBotApiChat(chat, additional, additional_full, sticker_set, pin_msg)
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

    async _getMessage(message, internal_call = false) {
        let _mid = message.id
        let _msg = message
        let chat, from, reply_msg, forward_info
        chat = await this._getChat(message.chat_id, internal_call, false)
        if (_msg.sender_user_id)
            from = await this._getUser(_msg.sender_user_id, false) // get Full User here.
        if (_msg.forward_info)
            switch (_msg.forward_info['@type']) {
                case 'messageForwardedFromUser':
                    forward_info = await this._getUser(_msg.forward_info.user_id, false)
                    break
                case 'messageForwardedPost':
                    forward_info = await this._getChat(_msg.forward_info.chat_id, internal_call, false)
                    break
            }
        if (_msg.reply_to_message_id && !internal_call)
            reply_msg = await this._getMessage((await this.run('getRepliedMessage', {
                chat_id: message.chat_id,
                message_id: _mid
            })), true)
        return _util.buildBotApiMessage(_msg, chat, from, reply_msg, forward_info)
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

    async _processIncomingUpdate(message) {
        if (message.is_outgoing) return
        let msg = await this._getMessage(message)
        this.emit('message', msg)
        console.log(msg)
    }

    async _initChatIfNeeded(chat_id) {
        // See https://github.com/tdlib/td/issues/263
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
                    force: true
                })
            } else if (chat_id < 0) {
                await this.run('getBasicGroup', {
                    basic_group_id: Math.abs(chat_id)
                })
                await this.run('createBasicGroupChat', {
                    basic_group_id: Math.abs(chat_id),
                    force: true
                })
            } else {
                await this.run('getUser', {
                    user_id: chat_id
                })
                await this.run('createPrivateChat', {
                    user_id: chat_id,
                    force: true
                })
            }
        }
        return
    }
}

module.exports = Bot
