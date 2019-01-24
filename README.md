# node-tdlib

## Install

### Use prebuilt binaries

```
npm i wfjsw/node-tdlib --save
```

NPM will automatically download the appropriate `tdlib.node` binary.

Please see below to compile on your own if there doesn't exist a suitable binary.

List of prebuilt binary is available [here](https://github.com/wfjsw/node-tdlib/releases).

### Compile on your own

```
git clone https://github.com/wfjsw/node-tdlib.git --recurse-submodules
cd node-tdlib
npm i
npm run compile
npm ln
```

When you need to use it, run

```
npm ln tdlib
```

Dependencies: cmake, gperf, zlib, node >= 10.0.0, same OpenSSL(libssl-dev) version with Node.js

You may check your Node.js Dependency by using `node -p process.versions`

Be careful when use `gcc` and `g++` as they will use up to 8GB memory. `clang` compiler is preferred but not required. Using `clang` will result in less memory requirement on compilation.

Optional Dependencies: ccache (will speed up subsequent compilation.)

## TdLib Raw Interface

```typescript
interface TDLib {
    /** 
     * Create a TDLib Client 
     * @returns {number} Return a sequence number for client identifier
     */
    td_client_create(): number;
    /**
     * Destroy a TDLib Client
     * @param {number} client_id Client identifier
     */
    td_client_destroy(client_id: number);
    /**
     * Sends request to TDLib.
     * @param {number} client_id Client identifier
     * @param {string} request JSON serialized request
     */
    td_client_send(client_id: number, request: string);
    /**
     * Receives incoming updates and request responses from TDLib.
     * @param {number} client_id Client identifier
     * @param {number} timeout Maximum number of seconds allowed for this function to wait for new data.
     */
    td_client_receive(client_id: number, timeout: number);
    /**
     * Sets the path to the file to where the internal TDLib log will be written. 
     * By default TDLib writes logs to stderr or an OS specific log. 
     * Use this method to write the log to a file instead.
     * @param {string} file_path Path to a file where the internal TDLib log will be written. Use an empty path to switch back to the default logging behaviour.
     * @returns {boolean} True on success, or false otherwise, i.e. if the file can't be opened for writing.
     */
    td_set_log_file_path(file_path: string): boolean;
    /**
     * Sets maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. 
     * Unused if log is not written to a file. Defaults to 10 MB.
     * @param {number} max_file_size Maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Should be positive.
     */
    td_set_log_max_file_size(max_file_size: number);
    /**
     * Sets the verbosity level of the internal logging of TDLib. 
     * By default the TDLib uses a verbosity level of 5 for logging.
     * @param {number} new_verbosity_level New value of the verbosity level for logging. Value 0 corresponds to fatal errors, value 1 corresponds to errors, value 2 corresponds to warnings and debug warnings, value 3 corresponds to informational, value 4 corresponds to debug, value 5 corresponds to verbose debug, value greater than 5 and up to 1024 can be used to enable even more logging.
     */
    td_set_log_verbosity_level(new_verbosity_level: number);
}
```

## TdClient Interface

See [TDLib Documentation](https://core.telegram.org/tdlib/docs/annotated.html) for further reference.

```typescript
class TdClientActor extends EventEmitter {
    constructor(options: TdClientActorOptions);
    run(method: string, params: object): Promise<object>;
    destroy(): Promise<void>;

    // Events:
    // ready
    // closed
    // __<types>
    // _fileDownloaded
    // _fileDownloaded:<file_id>
}

interface TdClientActorOptions {
    identifier: string;
    database_encryption_key: string;
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
```

## Logger Interface 

```typescript
interface Logger {
    /**
     * Sets the path to the file to where the internal TDLib log will be written. 
     * By default TDLib writes logs to stderr or an OS specific log. 
     * Use this method to write the log to a file instead.
     * @param {string} file_path Path to a file where the internal TDLib log will be written. Use an empty path to switch back to the default logging behaviour.
     * @returns {boolean} True on success, or false otherwise, i.e. if the file can't be opened for writing.
     */
    setLogFilePath(file_path: string): boolean;
    /**
     * Sets maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. 
     * Unused if log is not written to a file. Defaults to 10 MB.
     * @param {number} max_file_size Maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Should be positive.
     */
    setLogMaxFileSize(max_file_size: number);
    /**
     * Sets the verbosity level of the internal logging of TDLib. 
     * By default the TDLib uses a verbosity level of 5 for logging.
     * @param {number} new_verbosity_level New value of the verbosity level for logging. Value 0 corresponds to fatal errors, value 1 corresponds to errors, value 2 corresponds to warnings and debug warnings, value 3 corresponds to informational, value 4 corresponds to debug, value 5 corresponds to verbose debug, value greater than 5 and up to 1024 can be used to enable even more logging.
     */
    setLogVerbosityLevel(new_verbosity_level: number);
}
```

## Bot API Interface

See [Telegram Bot API](https://core.telegram.org/bots/api) and bundled TypeScript file for reference.

## License

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.
