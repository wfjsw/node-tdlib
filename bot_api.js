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
        this.ready = false
        this.on('updateAuthorizationState', (update) => {
            switch (update.authorization_state['@type']) {
                case 'authorizationStateWaitPhoneNumber':
                    return this.run('checkAuthenticationBotToken', {
                        token: bot_token
                    })
            }
        })
        this.once('ready', () => this.ready = true)
    }
    async getMe() {
        if (!this.ready) throw new Error('Not ready.')
        let me = await this.run('getMe', {})
        return {
            id: me.id,
            first_name: me.first_name,
            last_name: me.last_name,
            username: me.last_name,
            is_verified: me.is_verified,
            is_bot: me.type['@type'] == 'userTypeBot',
            type: me.type
        }
    }
    async sendMessage(chat_id, text, options = {}) {
        if (!this.ready) throw new Error('Not ready.')
        if (isNaN(chat_id))
            chat_id = (await this.run('searchPublicChat', {
                username: chat_id.match(/^[@]{0,1}([a-zA-Z0-9_]+)$/)[0]
            })).id
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
        if (options.parse_mode) {
            let parser
            switch (options.parse_mode) {
                case "Markdown":
                    parser = 'textParseModeMarkdown'
                    break
                case "HTML":
                    parser = 'textParseModeHTML'
                    break
            }
            opt.input_message_content.text = await this.run('parseTextEntities', {
                text,
                parse_mode: {
                    '@type': parser
                }
            })
        } else {
            opt.input_message_content.text = {
                text
            }
        }
        await this._initChatIfNeeded(chat_id)
        return this.run('sendMessage', opt)
    }

    async resolveUsername(username) {
        return this.run('searchPublicChat', {
            username: username.match(/^[@]{0,1}([a-zA-Z0-9_]+)$/)[0]
        })
    }

    async _initChatIfNeeded(chat_id) {
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
