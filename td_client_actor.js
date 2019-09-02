const {TDLib: lib} = require('./tdlib')
const EventEmitter = require('events')
const path = require('path')
const os = require('os')
const rq = require('request')
const fs = require('fs')
const fsp = fs.promises
const util = require('./util')
const { inspect } = require('util')

/**
 * @enum Polling mode
 */

/**
 * @typedef TdClientActorOptions
 * @property {number} api_id Application identifier for Telegram API access, which can be obtained at https://my.telegram.org.
 * @property {string} api_hash Application identifier hash for Telegram API access, which can be obtained at https://my.telegram.org.
 * @property {string} [identifier] Identifier between different TDLib instances.
 * @property {boolean} [use_test_dc] If set to true, the Telegram test environment will be used instead of the production environment.
 * @property {string} [database_directory] The path to the directory for the persistent database; if empty, the current working directory will be used.
 * @property {string} [files_directory] The path to the directory for storing files; if empty, database_directory will be used.
 * @property {boolean} [use_file_database] If set to true, information about downloaded and uploaded files will be saved between application restarts.
 * @property {boolean} [use_chat_info_database] If set to true, the library will maintain a cache of users, basic groups, supergroups, channels and secret chats. Implies use_file_database.
 * @property {boolean} [use_message_database] If set to true, the library will maintain a cache of chats and messages. Implies use_chat_info_database.
 * @property {boolean} [use_secret_chats] If set to true, support for secret chats will be enabled.
 * @property {string} [system_language_code] IETF language tag of the user's operating system language; must be non-empty.
 * @property {string} [device_model] Model of the device the application is being run on; must be non-empty.
 * @property {string} [system_version] Version of the operating system the application is being run on; must be non-empty.
 * @property {string} [application_version] Application version; must be non-empty.
 * @property {boolean} [enable_storage_optimizer] If set to true, old files will automatically be deleted.
 * @property {boolean} [ignore_file_names] If set to true, original file names will be ignored. Otherwise, downloaded files will be saved under names as close as possible to the original name.
 * @property {string} [database_encryption_key] The database encryption key. Usually the encryption key is never changed and is stored in some OS keychain.
 * @property {number} [poll_timeout]
 * @property {"sync"|"async"|"fdpipe"} [polling_mode]
 * @property {boolean} [use_cache]
 */

class TdClientActor extends EventEmitter {
    /**
     * @param {TdClientActorOptions} options 
     */
    constructor(options) {
        // @ts-ignore
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
        tdlib_param.files_directory = 'files_directory' in options ? options.files_directory : ''
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
        if (options.polling_mode) {
            if (['sync', 'async', 'fdpipe'].indexOf(options.polling_mode) > -1) {
                if (options.polling_mode === 'fdpipe') {
                    if (!lib.create_pipe_fd) options.polling_mode = 'sync'
                }
            } else {
                options.polling_mode = 'sync'
            }
        } else {
            options.polling_mode = 'sync'
        }
        this._encryption_key = 'database_encryption_key' in options ? options.database_encryption_key : 'password'

        this._options.use_cache = 'use_cache' in options ? options.use_cache : true

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
                    /**
                     * Client is ready.
                     * @event TdClientActor#ready
                     */
                    return this.emit('ready')
                case 'authorizationStateClosed':
                    /**
                     * Client is destroyed.
                    * @event TdClientActor#closed
                    */
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

        this._instance_id = lib.td_client_create()
        process.on('SIGUSR2', () => {
            console.log('Last Update Time:', new Date(this._lastUpdateTime).toString())
            console.log('Last Update:', require('util').inspect(this._lastUpdate))
        })

        if (options.polling_mode === 'fdpipe') {
            const [readfd, writefd] = lib.create_pipe_fd()
            this._fd = [readfd, writefd]
            this._readstream = fs.createReadStream(null, { fd: readfd, encoding: 'utf8' })
            this._readstream.on('data', this._processUpdate.bind(this))
            lib.register_receiver_fd(this._instance_id, writefd)
        } else {
            setImmediate(this._pollUpdates.bind(this), options.poll_timeout, false)
        }
    }

    /**
     * Run a TDLib method.
     * @param {string} method Method name. See https://core.telegram.org/tdlib/docs/annotated.html
     * @param {object} params Parameters.
     */
    run(method, params = {}) {
        let stack_trace = new Error().stack.split('\n').slice(1).join('\n')
        const is_cacheable = this._isCacheableMethod(method)
        if (is_cacheable) {
            const cache = this._readCache(method, params)
            if (cache !== undefined) {
                return Promise.resolve(Object.assign({}, cache)) // Copy the object to prevent modified object pollutes cache.
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

    execute(method, params) {
        if (this._closed) throw new Error('already destroyed')
        let req = params
        req['@type'] = method
        this.once(`_update:${req['@extra']}`, (res) => {

        })
        let result = lib.td_client_execute(this._instance_id, JSON.stringify(req))
        let stack_trace = new Error().stack.split('\n').slice(1).join('\n')
        result = JSON.parse(result)
        if (result['@type'] == 'error') {
            Object.defineProperty(result, 'stack', {
                value: `Error ${result.code}: ${result.message}\nCaused by: ${method}\nParams: ${inspect(params)}\n${stack_trace}`,
                enumerable: false,
                configurable: false,
                writable: false
            })
            result.method = method
            result.params = params
            throw result
        }
        return result
    }

    /**
     * Destory TDLib Client.
     * @fires TdClientActor#destroy
     */
    destroy() {
        return new Promise((rs, rj) => {
            if (this._closed) rj(new Error('Already closed.'))
            this._closed = true
            this.once('closed', () => {
                rs()
            })
            setImmediate(lib.td_client_destroy, this._instance_id)
        })
    }

    /**
     * Poll for updates
     * @private
     * @param {number} timeout 
     * @param {boolean} is_recursive 
     */
    _pollUpdates(timeout = 5, is_recursive = false) {
        if (is_recursive && this._closed) {
            console.log('Client closed. Stopping recursive update.')
        }
        if (this._closed) throw new Error('is closed')
        if (this._options.polling_mode === 'async') {
            lib.td_client_receive_async(this._instance_id, timeout, (err, res) => {
                if (err) {
                    console.error(err)
                    return setTimeout(this._pollUpdates.bind(this), 50, timeout, true)
                }
                if (res === '') {
                    return setImmediate(this._pollUpdates.bind(this), timeout, true)
                }
                // console.log(update)
                try {
                    this._processUpdate(res)
                } catch (e) {
                    console.error(e)
                }
                setImmediate(this._pollUpdates.bind(this), timeout, true)
            })
        } else if (this._options.polling_mode === 'sync') {
            timeout = 0 // force timeout to be 0 to avoid main thread block
            let updates
            try {
                updates = lib.td_client_receive(this._instance_id, timeout)
            } catch (e) {
                console.error(e)
                return setTimeout(this._pollUpdates.bind(this), 50, timeout, true)
            }
            if (Array.isArray(updates) && updates.length > 0) {
                for (let u of updates) {
                    // console.log(update)
                    try {
                        this._processUpdate(u)
                    } catch (e) {
                        console.error(e)
                    }
                }
                this._lastUpdateTime = Date.now()
                this._lastUpdate = updates[updates.length - 1]
            }
            setTimeout(this._pollUpdates.bind(this), 20, timeout, true)
        }
    }

    _processUpdate(update_string) {
        const update = JSON.parse(update_string)
        const extra = update['@extra'] || ''

        if (this._isCacheableUpdate(update['@type'])) {
            this._writeCache(update['@type'], update)
        }

        if (update['@type'] && update['@type'] !== 'error') {
            this.emit('__' + update['@type'], update)
        }
        delete update['@extra']
        if (extra) {
            this.emit(`_update:${extra}`, update)
        }
        this._lastUpdateTime = Date.now()
        this._lastUpdate = update
        return
    }

    async _generateFile(update) {
        let self = this
        if (update.conversion == '#url#') {
            return rq
                .get(update.original_path)
                .on('error', (err) => {
                    // @ts-ignore
                    if (err.is_incoming_error) {
                        return self.run('finishFileGeneration', {
                            generation_id: update.generation_id,
                            error: {
                                code: err.code,
                                message: err.message
                            }
                        })
                    } else if (err.code == 'ETIMEDOUT') {
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
                            // @ts-ignore
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

    _isCacheableMethod(key) {
        return this._options.use_cache && ['getChat', 'getUser', 'getBasicGroup', 'getSupergroup', 'getSecretChat'].indexOf(key) > -1
    }

    _isCacheableUpdate(key) {
        return this._options.use_cache && [
            'updateNewChat', 
            'updateUser',
            'updateBasicGroup',
            'updateSupergroup',
            'updateSecretChat',
            'updateChatTitle',
            'updateChatPhoto',
            'updateChatLastMessage',
            'updateChatOrder',
            'updateChatReadInbox',
            'updateChatReadOutbox',
            'updateChatReplyMarkup',
            'updateChatDraftMessage',
            'updateChatNotificationSettings',
            'updateChatUnreadMentionCount',
            'updateChatIsPinned',
            'updateChatDefaultDisableNotification',
            'updateChatIsSponsored',
            'updateChatIsMarkedAsUnread',
            'updateUserStatus'
        ].indexOf(key) > -1
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
            if (this._cache.has(`chat:${data.chat.id}`)) {
                Object.assign(this._cache.get(`chat:${data.chat.id}`), data.chat)
            } else {
                this._cache.set(`chat:${data.chat.id}`, data.chat)
            }
        } else if (name === 'updateUser') {
            if (this._cache.has(`user:${data.user.id}`)) {
                Object.assign(this._cache.get(`user:${data.user.id}`), data.user)
            } else {
                this._cache.set(`user:${data.user.id}`, data.user)
            }
        } else if (name === 'updateBasicGroup') {
            if (this._cache.has(`basicgroup:${data.basic_group.id}`)) {
                Object.assign(this._cache.get(`basicgroup:${data.basic_group.id}`), data.basic_group)
            } else {
                this._cache.set(`basicgroup:${data.basic_group.id}`, data.basic_group)
            }
        } else if (name === 'updateSupergroup') {
            if (this._cache.has(`supergroup:${data.supergroup.id}`)) {
                Object.assign(this._cache.get(`supergroup:${data.supergroup.id}`), data.supergroup)
            } else {
                this._cache.set(`supergroup:${data.supergroup.id}`, data.supergroup)
            }
        } else if (name === 'updateSecretChat') {
            if (this._cache.has(`secretchat:${data.secret_chat.id}`)) {
                Object.assign(this._cache.get(`secretchat:${data.secret_chat.id}`), data.secret_chat)
            } else {
                this._cache.set(`secretchat:${data.secret_chat.id}`, data.secret_chat)
            }
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
