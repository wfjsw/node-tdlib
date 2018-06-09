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
            use_message_database: true,
            use_secret_chats: false,
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
            opt.input_message_content.text = { text }
        }
        return this.run('sendMessage', opt)
    }
}

module.exports = Bot
