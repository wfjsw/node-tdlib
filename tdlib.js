
// @ts-nocheck

const tdlib_native = require('./tdlib.node')

/**
 * TDLib Native Library Wrapper
 */
class TDLibNative {
    /** 
     * Create a TDLib Client 
     * @returns {number} Return a sequence number for client identifier
     */
    static td_client_create() { return tdlib_native.td_client_create() }
    /**
     * Destroy a TDLib Client
     * @param {number} client_id Client identifier
     */
    static td_client_destroy(client_id) { tdlib_native.td_client_destroy(client_id) }
    /**
     * Sends request to TDLib.
     * @param {number} client_id Client identifier
     * @param {string} request JSON serialized request
     */
    static td_client_send(client_id, request) { tdlib_native.td_client_send(client_id, request) }
    /**
     * Receives incoming updates and request responses from TDLib.
     * @param {number} client_id Client identifier
     * @param {number} timeout Maximum number of seconds allowed for this function to wait for new data.
     */
    static td_client_receive(client_id, timeout) { tdlib_native.td_client_receive(client_id, timeout) }

    /**
     * @callback TdClientReceiveAsyncCallback
     * @param {Error} err Error
     * @param {object} res Result    
     */

    /**
     * Receives incoming updates and request responses from TDLib.
     * @param {number} client_id Client identifier
     * @param {number} timeout Maximum number of seconds allowed for this function to wait for new data.
     * @param {TdClientReceiveAsyncCallback} callback
     */
    static td_client_receive_async(client_id, timeout, callback) { tdlib_native.td_client_receive_async(client_id, timeout, callback) }
    /**
     * Sets the path to the file to where the internal TDLib log will be written. 
     * By default TDLib writes logs to stderr or an OS specific log. 
     * Use this method to write the log to a file instead.
     * @param {string} file_path Path to a file where the internal TDLib log will be written. Use an empty path to switch back to the default logging behaviour.
     * @returns {boolean} True on success, or false otherwise, i.e. if the file can't be opened for writing.
     */
    static td_set_log_file_path(file_path) { return tdlib_native.td_set_log_file_path(file_path) }
    /**
     * Sets maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. 
     * Unused if log is not written to a file. Defaults to 10 MB.
     * @param {number} max_file_size Maximum size of the file to where the internal TDLib log is written before the file will be auto-rotated. Should be positive.
     */
    static td_set_log_max_file_size(max_file_size) { tdlib_native.td_set_log_max_file_size(max_file_size) }
    /**
     * Sets the verbosity level of the internal logging of TDLib. 
     * By default the TDLib uses a verbosity level of 5 for logging.
     * @param {number} new_verbosity_level New value of the verbosity level for logging. Value 0 corresponds to fatal errors, value 1 corresponds to errors, value 2 corresponds to warnings and debug warnings, value 3 corresponds to informational, value 4 corresponds to debug, value 5 corresponds to verbose debug, value greater than 5 and up to 1024 can be used to enable even more logging.
     */
    static td_set_log_verbosity_level(new_verbosity_level) { tdlib_native.td_set_log_verbosity_level(new_verbosity_level) }
    /**
     * Create a pipe file descriptior pair
     * @returns {number[]} A pair of reader/writer file descriptor
     */
    static create_pipe_fd() { return tdlib_native.create_pipe_fd() }
    /**
     * Register a file descriptor as client event listener.
     * @param {number} client_id 
     * @param {number} write_fd 
     */
    static register_receiver_fd(client_id, write_fd) { tdlib_native.register_receiver_fd(client_id, write_fd) }

}

module.exports = TDLibNative
