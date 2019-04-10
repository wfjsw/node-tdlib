const td = require('./tdlib')

/**
 * TDLib Logger Wrapper
 */
class Logger {
    /**
    * Sets the path to the file to where the internal TDLib log will be written.
    * By default TDLib writes logs to stderr or an OS specific log.
    * Use this method to write the log to a file instead.
    * @param {string} file_path Path to a file where the internal TDLib log will be written. Use an empty path to switch back to the default logging behaviour.
    * @returns {boolean} True on success, or false otherwise, i.e. if the file can't be opened for writing.
    */
    static setLogFilePath(file_path) { return td.td_set_log_file_path(file_path) }

    /**
    * Sets maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated.
    * Unused if log is not written to a file. Defaults to 10 MB.
    * @param {number} max_file_size Maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Should be positive.
    */
    static setLogMaxFileSize(max_file_size) { return td.td_set_log_max_file_size(max_file_size) }

    /**
    * Sets the verbosity level of the internal logging of TDLib.
    * By default the TDLib uses a verbosity level of 5 for logging.
    * @param {number} new_verbosity_level New value of the verbosity level for logging. Value 0 corresponds to fatal errors, value 1 corresponds to errors, value 2 corresponds to warnings and debug warnings, value 3 corresponds to informational, value 4 corresponds to debug, value 5 corresponds to verbose debug, value greater than 5 and up to 1024 can be used to enable even more logging.
    */
    static setLogVerbosityLevel(new_verbosity_level) { return td.td_set_log_verbosity_level(new_verbosity_level) }
}

module.exports = Logger
