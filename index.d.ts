import { Bot as CBot } from "./bot_api";
import { TdClientActor as CTdClientActor } from "./td_client_actor";

export as namespace tdlib;

export var Bot: CBot;

export var TdClientActor: CTdClientActor;

declare enum ELoggerVerbosityLevel {
    Fatal = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4, 
    Verbose = 5
}

declare interface ILogger {
    /**
     * Sets the path to the file to where the internal TDLib log will be written. By default TDLib writes logs to stderr or an OS specific log. Use this method to write the log to a file instead.
     * @param {string} file_path Path to a file where the internal TDLib log will be written. Use an empty path to switch back to the default logging behaviour.
     * @returns {boolean} True on success, or false otherwise, i.e. if the file can't be opened for writing.
     */
    setLogFilePath(file_path: string): boolean;
    /**
     * Sets maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Unused if log is not written to a file. Defaults to 10 MB.
     * @param {number} max_file_size Maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Should be positive.
     */
    setLogMaxFileSize(max_file_size: number);
    /**
     * Sets the verbosity level of the internal logging of TDLib. By default the TDLib uses a verbosity level of 5 for logging.
     * @param {number} new_verbosity_level New value of the verbosity level for logging. Value 0 corresponds to fatal errors, value 1 corresponds to errors, value 2 corresponds to warnings and debug warnings, value 3 corresponds to informational, value 4 corresponds to debug, value 5 corresponds to verbose debug, value greater than 5 and up to 1024 can be used to enable even more logging.
     */
    setLogVerbosityLevel(new_verbosity_level: ELoggerVerbosityLevel);
}

export var Logger: ILogger;

declare interface ITDLib {
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
     * Sets the path to the file to where the internal TDLib log will be written. By default TDLib writes logs to stderr or an OS specific log. Use this method to write the log to a file instead.
     * @param {string} file_path Path to a file where the internal TDLib log will be written. Use an empty path to switch back to the default logging behaviour.
     * @returns {boolean} True on success, or false otherwise, i.e. if the file can't be opened for writing.
     */
    td_set_log_file_path(file_path: string): boolean;
    /**
     * Sets maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Unused if log is not written to a file. Defaults to 10 MB.
     * @param {number} max_file_size Maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Should be positive.
     */
    td_set_log_max_file_size(max_file_size: number);
    /**
     * Sets the verbosity level of the internal logging of TDLib. By default the TDLib uses a verbosity level of 5 for logging.
     * @param {number} new_verbosity_level New value of the verbosity level for logging. Value 0 corresponds to fatal errors, value 1 corresponds to errors, value 2 corresponds to warnings and debug warnings, value 3 corresponds to informational, value 4 corresponds to debug, value 5 corresponds to verbose debug, value greater than 5 and up to 1024 can be used to enable even more logging.
     */
    td_set_log_verbosity_level(new_verbosity_level: number);
}

export var TDLib: ITDLib;
