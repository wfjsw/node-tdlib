/**
 * Generate 8-char random identifier to be used as '@extra' for RPC call. 
 * @returns Random identifier
 */
declare export function generateRpcReqId(): string;

/**
 * Generate a temp directory path for TDLib Instance.
 * @param instance_name Instance name.
 * @returns Temp file location
 */
declare export function generateTempFileLocation(instance_name?: string): string;

/**
 * Translate MTProto API message id to TDLib message id
 * @param msg_id MTProto API message id
 * @returns TDLib message id
 */
declare export function get_tdlib_message_id(msg_id: number): number;

/**
 * Translate TDLib API message id to MTProto message id
 * @param msg_id TDLib API message id
 * @returns MTProto message id
 */
declare export function get_api_message_id(msg_id: number): number;

/**
 * Promise-based asynchoronous scrypt key derivation
 * @param password Password
 * @param salt Salt
 * @param keylen Key length
 * @return Derived key
 */
declare export function scrypt(password: string | Buffer | Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array | DataView, salt: string | Buffer | Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array | DataView, keylen: number): Promise<Buffer>;

declare export function fileExists()

export as namespace Utils;
