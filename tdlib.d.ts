declare export interface TDLibNativeInterface {
    /** 
     * Create a TDLib Client 
     * @returns {number} Return a sequence number for client identifier
     */
    td_client_create(): number;
    /**
     * Destroy a TDLib Client
     * @param {number} client_id Client identifier
     */
    td_client_destroy(client_id: number): void;
    /**
     * Sends request to TDLib.
     * @param {number} client_id Client identifier
     * @param {string} request JSON serialized request
     */
    td_client_send(client_id: number, request: string): void;
    /**
     * Receives incoming updates and request responses from TDLib.
     * @param {number} client_id Client identifier
     * @param {number} timeout Maximum number of seconds allowed for this function to wait for new data.
     */
    td_client_receive(client_id: number, timeout: number): string[];
    /**
     * Sends synchronized request to TDLib.
     * @param client_id Client identifier
     * @param request JSON serialized request
     */
    td_client_execute(client_id: number, request: string): string;
    /**
     * Receives incoming updates and request responses from TDLib.
     * @param {number} client_id Client identifier
     * @param {number} timeout Maximum number of seconds allowed for this function to wait for new data.
     * @param {Function} callback
     */
    td_client_receive_async(client_id: number, timeout: number, callback: (err: Error, res: string) => void): void;
    /**
     * Create a pipe file descriptior pair
     * @returns {number[]} A pair of reader/writer file descriptor
     */
    create_pipe_fd(): number[];
    /**
     * Register a file descriptor as client event listener.
     * @param {number} client_id 
     * @param {number} write_fd 
     */
    register_receiver_fd(client_id: number, write_fd: number): void;
}

declare export const TDLib: TDLibNativeInterface;
export as namespace TDLibNative;
