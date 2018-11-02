import { updateFileGenerationStart, updateFile } from "./tdlib_types";

interface TdClientActorOptions {
    identifier: string;
    database_encryption_key: string;
}

interface TdClientActorOptions {
    /** Application identifier for Telegram API access, which can be obtained at https://my.telegram.org.  */
    api_id: string;
    /** Application identifier hash for Telegram API access, which can be obtained at https://my.telegram.org.  */
    api_hash: string;
    /** If set to true, the Telegram test environment will be used instead of the production environment.  */
    use_test_dc?: boolean;
    /** The path to the directory for the persistent database; if empty, a dedicated directory named in identifier will be used.  */
    database_directory?: string;
    /** If set to true, information about downloaded and uploaded files will be saved between application restarts.  */
    use_file_database?: boolean;
    /** If set to true, the library will maintain a cache of users, basic groups, supergroups, channels and secret chats. Implies use_file_database.  */
    use_chat_info_database?: boolean;
    /** If set to true, the library will maintain a cache of chats and messages. Implies use_chat_info_database.  */
    use_message_database?: boolean;
    /** If set to true, support for secret chats will be enabled.  */
    use_secret_chats?: boolean;
    /** IETF language tag of the user's operating system language; must be non-empty.  */
    system_language_code?: string;
    /** Model of the device the application is being run on; must be non-empty.  */
    device_model?: string;
    /** Version of the operating system the application is being run on; must be non-empty. */
    system_version?: string;
    /** Application version; must be non-empty.  */
    application_version?: string;
    /** If set to true, old files will automatically be deleted.  */
    enable_storage_optimizer?: string;
    /** If set to true, original file names will be ignored. Otherwise, downloaded files will be saved under names as close as possible to the original name.  */
    ignore_file_names?: boolean;
}

export class TdClientActor {
    protected _instance_id: number;
    protected _closed: boolean;
    protected _lastUpdateTime: number;
    protected _lastUpdate: object;
    private _options: TdClientActorOptions;
    private _tdlib_param: TdClientActorOptions;
    private _encryption_key: string;
    constructor(options: TdClientActorOptions);
    run(method: string, params: object): Promise<object>;
    destroy(): Promise<void>;
    private _pollupdates(timeout: number, is_recursive: false);
    private _generateFile(update: updateFileGenerationStart);
    private _emitFileDownloadedEvent(update: updateFile);
}
