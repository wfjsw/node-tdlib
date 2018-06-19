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
        this.conversion = new(require('./bot_types'))(this)
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
            text: this._generateFormattedText(text, options.parse_mode)
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
            disable_notification: !!options.disable_notification,
            from_background: true
        }
        await this._initChatIfNeeded(chat_id)
        await this._initChatIfNeeded(from_chat_id)
        return this.run('forwardMessages', opt)
    }

    async sendPhoto(chat_id, photo, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        let media = {
            '@type': 'inputMessagePhoto',
            
        }
        if (options.caption)
            media.caption = this._generateFormattedText(options.caption, options.parse_mode)
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

    async getUser(user_id) {
        if (!this.ready) throw new Error('Not ready.')
        return this._getUser(user_id)
    }

    async getChat(chat_id) {
        if (!this.ready) throw new Error('Not ready.')
        return this._getChat(chat_id, true)
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
