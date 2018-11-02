export function generateRpcReqId(): string;

export function generateTempFileLocation(instance_name: string): string;

export function get_tdlib_message_id(msg_id: number): number;

export function get_api_message_id(msg_id: number): number;

export function scrypt(password: string | Buffer | DataView, salt: string | Buffer | DataView, keylen: number);

export function fileExists(_path: string, mode: number): Promise<boolean>;

export function fileExistsSync(_path: string, mode: number): boolean;
