const lib = require('./tdlib.node')
const EventEmitter = require('events')
const path = require('path')
const os = require('os')
const rq = require('request')
const fs = require('fs')
const fsp = fs.promises
const util = require('./util')
const {inspect} = require('util')

class TdClientActor extends EventEmitter {
    constructor(options = {}) {
        super({
            wildcard: true
        })
        this._closed = false
        this._lastUpdateTime = 0
        this._lastUpdate = {}
        this._cache = new Map()
        this._options = options
        if (!options.api_id || !options.api_hash || !('identifier' in options)) throw new Error('missing api_id, api_hash or identifier')
        let tdlib_param = {
            '@type': 'tdlibParameters'
        }
        if (options.use_test_dc) tdlib_param.use_test_dc = true
        let dirname = require.main ? path.dirname(require.main.filename) : __dirname
        tdlib_param.database_directory = 'database_directory' in options ? path.join(options.database_directory, options.identifier) : path.join(dirname, 'td_data', options.identifier)
        tdlib_param.use_file_database = 'use_file_database' in options ? options.use_file_database : true
        tdlib_param.use_chat_info_database = 'use_chat_info_database' in options ? options.use_chat_info_database : true
        tdlib_param.use_message_database = 'use_message_database' in options ? options.use_message_database : true
        tdlib_param.use_secret_chats = 'use_secret_chats' in options ? options.use_secret_chats : true
        tdlib_param.api_id = options.api_id
        tdlib_param.api_hash = options.api_hash
        tdlib_param.system_language_code = 'system_language_code' in options ? options.system_language_code : 'en-US'
        tdlib_param.device_model = 'device_model' in options ? options.device_model : 'Unknown'
        tdlib_param.system_version = 'system_version' in options ? options.system_version : `${os.type()} ${os.hostname()} ${os.release()}`
        tdlib_param.application_version = 'application_version' in options ? options.application_version : 'dogfood'
        tdlib_param.enable_storage_optimizer = 'enable_storage_optimizer' in options ? options.enable_storage_optimizer : true
        tdlib_param.ignore_file_names = 'ignore_file_names' in options ? options.ignore_file_names : false
        if ('use_file_database' in options && options.use_file_database == false) {
            tdlib_param.use_message_database = false
            tdlib_param.use_chat_info_database = false
        }
        this._tdlib_param = tdlib_param
        this._encryption_key = 'database_encryption_key' in options ? options.database_encryption_key : 'password'
        this.on('__updateAuthorizationState', async (update) => {
            switch (update.authorization_state['@type']) {
                case 'authorizationStateWaitTdlibParameters':
                    return this.run('setTdlibParameters', {
                        parameters: tdlib_param
                    })
                case 'authorizationStateWaitEncryptionKey':
                    return this.run('checkDatabaseEncryptionKey', {
                        encryption_key: this._encryption_key
                    })
                case 'authorizationStateReady':
                    return this.emit('ready')
                case 'authorizationStateClosed':
                    return this.emit('closed')
            }
        })
        this.on('__updateFileGenerationStart', (update) => {
            return this._generateFile(update)
        })
        // this.on('__updateFile', update => {
        //    return this._cleanUploadedFile(update)
        // })
        this.on('__updateFile', update => {
            return this._emitFileDownloadedEvent(update)
        })

        this.on('__updateNewChat', update => this._writeCache('updateNewChat', update))
        this.on('__updateUser', update => this._writeCache('updateUser', update))
        this.on('__updateBasicGroup', update => this._writeCache('updateBasicGroup', update))
        this.on('__updateSupergroup', update => this._writeCache('updateSupergroup', update))
        this.on('__updateSecretChat', update => this._writeCache('updateSecretChat', update))
        this.on('__updateChatTitle', update => this._writeCache('updateChatTitle', update))
        this.on('__updateChatPhoto', update => this._writeCache('updateChatPhoto', update))
        this.on('__updateChatLastMessage', update => this._writeCache('updateChatLastMessage', update))
        this.on('__updateChatOrder', update => this._writeCache('updateChatOrder', update))
        this.on('__updateChatReadInbox', update => this._writeCache('updateChatReadInbox', update))
        this.on('__updateChatReadOutbox', update => this._writeCache('updateChatReadOutbox', update))
        this.on('__updateChatReplyMarkup', update => this._writeCache('updateChatReplyMarkup', update))
        this.on('__updateChatDraftMessage', update => this._writeCache('updateChatDraftMessage', update))
        this.on('__updateChatNotificationSettings', update => this._writeCache('updateChatNotificationSettings', update))
        this.on('__updateChatUnreadMentionCount', update => this._writeCache('updateChatUnreadMentionCount', update))
        this.on('__updateChatIsPinned', update => this._writeCache('updateChatIsPinned', update))
        this.on('__updateChatDefaultDisableNotification', update => this._writeCache('updateChatDefaultDisableNotification', update))
        this.on('__updateChatIsSponsored', update => this._writeCache('updateChatIsSponsored', update))
        this.on('__updateChatIsMarkedAsUnread', update => this._writeCache('updateChatIsMarkedAsUnread', update))
        this.on('__updateUserStatus', update => this._writeCache('updateUserStatus', update))

        this._instance_id = lib.td_client_create()
        process.on('SIGUSR2', () => {
            console.log('Last Update Time:', new Date(this._lastUpdateTime).toString())
            console.log('Last Update:', require('util').inspect(this._lastUpdate))
        })
        setImmediate(this._pollupdates.bind(this), options.poll_timeout, false)
    }

    run(method, params = {}) {
        let stack_trace = new Error().stack.split('\n').slice(1).join('\n')
        const is_cacheable = this._isCacheable(method)
        if (is_cacheable) {
            const cache = this._readCache(method, params)
            if (cache !== undefined) {
                return Promise.resolve(cache)
            }
        }
        return new Promise((rs, rj) => {
            if (this._closed) throw new Error('already destroyed')
            let req = params
            req['@type'] = method
            req['@extra'] = util.generateRpcReqId()
            this.once(`_update:${req['@extra']}`, (res) => {
                if (res['@type'] == 'error') {
                    Object.defineProperty(res, 'stack', {
                        value: `Error ${res.code}: ${res.message}\nCaused by: ${method}\nParams: ${inspect(params)}\n${stack_trace}`,
                        enumerable: false,
                        configurable: false,
                        writable: false
                    })
                    res.method = method
                    res.params = params
                    return rj(res)
                }
                rs(res)
            })
            lib.td_client_send(this._instance_id, JSON.stringify(req))
        })
    }

    destroy() {
        return new Promise((rs, rj) => {
            if (this._closed) rj(new Error('Already closed.'))
            this._closed = true
            this.once('closed', rs)
            setImmediate(lib.td_client_destroy, this._instance_id)
        })

    }

    _pollupdates(timeout = 5, is_recursive = false) {
        if (is_recursive && this._closed) {
            console.log('Client closed. Stopping recursive update.')
        }
        if (this._closed) throw new Error('is closed')
        if (this._options.async_polling) {
            lib.td_client_receive_async(this._instance_id, timeout, (err, res) => {
                if (err) {
                    console.error(err)
                    return setTimeout(this._pollupdates.bind(this), 50, timeout, true)
                }
                if (res === '') {
                    return setImmediate(this._pollupdates.bind(this), timeout, true)
                }
                // console.log(update)
                try {
                    const update = JSON.parse(res)
                    const extra = update['@extra'] || ''

                    if (update['@type'] && update['@type'] !== 'error') {
                        this.emit('__' + update['@type'], update)
                    }
                    delete update['@extra']
                    if (extra) {
                        this.emit(`_update:${extra}`, update)
                    }
                    this._lastUpdateTime = Date.now()
                    this._lastUpdate = update
                } catch (e) {
                    console.error(e)
                }
                setImmediate(this._pollupdates.bind(this), timeout, true)
            })
        } else {
            timeout = 0 // force timeout to be 0 to avoid main thread block
            let updates
            try {
                updates = lib.td_client_receive(this._instance_id, timeout)
            } catch (e) {
                console.error(e)
                return setTimeout(this._pollupdates.bind(this), 50, timeout, true)
            }
            if (Array.isArray(updates) && updates.length > 0) {
                for (let u of updates) {
                    // console.log(update)
                    try {
                        const update = JSON.parse(u)
                        const extra = update['@extra'] || ''

                        if (update['@type'] && update['@type'] !== 'error') {
                            this.emit('__' + update['@type'], update)
                        }
                        delete update['@extra']
                        if (extra) {
                            this.emit(`_update:${extra}`, update)
                        }
                        this._lastUpdateTime = Date.now()
                        this._lastUpdate = update
                    } catch (e) {
                        console.error(e)
                    }
                }
                this._lastUpdateTime = Date.now()
                this._lastUpdate = updates[updates.length - 1]
            }
            setTimeout(this._pollupdates.bind(this), 20, timeout, true)
        }
    }

    async _generateFile(update) {
        let self = this
        if (update.conversion == '#url#') {
            return rq
                .get(update.original_path)
                .on('error', (err) => {
                    if (err.is_incoming_error) {
                        return self.run('finishFileGeneration', {
                            generation_id: update.generation_id,
                            error: {
                                code: err.code,
                                message: err.message
                            }
                        })
                    } else if (err.errno == 'ETIMEDOUT') {
                        return self.run('finishFileGeneration', {
                            generation_id: update.generation_id,
                            error: {
                                code: 504,
                                message: err.code
                            }
                        })
                    } else {
                        return self.run('finishFileGeneration', {
                            generation_id: update.generation_id,
                            error: {
                                code: 502,
                                message: err.code
                            }
                        })
                    }
                })
                .on('response', (incoming) => {
                    if (incoming.statusCode != 200) {
                        return incoming.destroy({
                            code: incoming.statusCode,
                            message: incoming.statusMessage,
                            is_incoming_error: true
                        })
                    }
                })
                .pipe(fs.createWriteStream(update.destination_path))
                .on('finish', () => {
                    return this.run('finishFileGeneration', {
                        generation_id: update.generation_id
                    })
                })
        } else if (update.conversion == '#copy_rename_remove#') {
            try {
                let _path = path.parse(update.original_path)
                let orig = _path.dir
                await fsp.rename(orig, update.destination_path)
                return this.run('finishFileGeneration', {
                    generation_id: update.generation_id
                })
            } catch (e) {
                return this.run('finishFileGeneration', {
                    generation_id: update.generation_id,
                    error: {
                        code: 500,
                        message: e.message
                    }
                })
            }
        } else if (update.conversion == '#copy_rename#') {
            try {
                let _path = path.parse(update.original_path)
                let orig = _path.dir
                await fsp.copyFile(orig, update.destination_path, fs.constants.COPYFILE_FICLONE)
                return this.run('finishFileGeneration', {
                    generation_id: update.generation_id
                })
            } catch (e) {
                return this.run('finishFileGeneration', {
                    generation_id: update.generation_id,
                    error: {
                        code: 500,
                        message: e.message
                    }
                })
            }
        } else if (update.conversion == '#temp_file#') {
            try {
                await fsp.rename(update.original_path, update.destination_path)
                return this.run('finishFileGeneration', {
                    generation_id: update.generation_id
                })
            } catch (e) {
                return this.run('finishFileGeneration', {
                    generation_id: update.generation_id,
                    error: {
                        code: 500,
                        message: e.message
                    }
                })
            }
        }
    }

    _emitFileDownloadedEvent(update) {
        if (!update.file.local) return
        if (update.file.local.is_downloading_completed) {
            this.emit(`_fileDownloaded:${update.file.id}`, update.file)
            this.emit('_fileDownloaded', update.file)
        }
    }

    // Cache System Start

    _isCacheable(key) {
        return ['getChat', 'getUser', 'getBasicGroup', 'getSupergroup', 'getSecretChat'].indexOf(key) > -1
    }

    _readCache(name, options) {
        if (name === 'getChat') {
            const key = `chat:${options.chat_id}`
            return this._cache.get(key)
        } else if (name === 'getUser') {
            const key = `user:${options.user_id}`
            return this._cache.get(key)
        } else if (name === 'getBasicGroup') {
            const key = `basicgroup:${options.basic_group_id}`
            return this._cache.get(key)
        } else if (name === 'getSupergroup') {
            const key = `supergroup:${options.supergroup_id}`
            return this._cache.get(key)
        } else if (name === 'getSecretChat') {
            const key = `secretchat:${options.secret_chat_id}`
            return this._cache.get(key)
        } else {
            return undefined
        }
    }

    _writeCache(name, data) {
        if (name === 'updateNewChat') {
            this._cache.set(`chat:${data.chat.id}`, data.chat)
        } else if (name === 'updateUser') {
            this._cache.set(`user:${data.user.id}`, data.user)
        } else if (name === 'updateBasicGroup') {
            this._cache.set(`basicgroup:${data.basic_group.id}`, data.basic_group)
        } else if (name === 'updateSupergroup') {
            this._cache.set(`supergroup:${data.supergroup.id}`, data.supergroup)
        } else if (name === 'updateSecretChat') {
            this._cache.set(`secretchat:${data.secret_chat.id}`, data.secret_chat)
        } else if (name === 'updateChatTitle') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.title = data.title
        } else if (name === 'updateChatPhoto') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.photo = data.photo
        } else if (name === 'updateChatLastMessage') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.last_message = data.last_message
            cache.order = data.order
        } else if (name === 'updateChatOrder') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.order = data.order
        } else if (name === 'updateChatReadInbox') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.last_read_inbox_message_id = data.last_read_inbox_message_id
            cache.unread_count = data.unread_count
        } else if (name === 'updateChatReadOutbox') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.last_read_outbox_message_id = data.last_read_outbox_message_id
        } else if (name === 'updateChatReplyMarkup') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.reply_markup_message_id = data.reply_markup_message_id
        } else if (name === 'updateChatDraftMessage') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.draft_message = data.draft_message        
            cache.order = data.order
        } else if (name === 'updateChatNotificationSettings') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.notification_settings = data.notification_settings
        } else if (name === 'updateChatUnreadMentionCount') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.unread_mention_count = data.unread_mention_count
        } else if (name === 'updateChatIsPinned') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.is_pinned = data.is_pinned
            cache.order = data.order
        } else if (name === 'updateChatDefaultDisableNotification') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.default_disable_notification = data.default_disable_notification
        } else if (name === 'updateChatIsSponsored') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.is_sponsored = data.is_sponsored
            cache.order = data.order
        } else if (name === 'updateChatIsMarkedAsUnread') {
            const cache = this._cache.get(`chat:${data.chat_id}`)
            cache.is_marked_as_unread = data.is_marked_as_unread
        } else if (name === 'updateUserStatus') {
            const cache = this._cache.get(`user:${data.user_id}`)
            cache.status = data.status
        }
    }

    // Cache System End

}

exports.TdClientActor = TdClientActor
