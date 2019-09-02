import { EventEmitter } from "events";
import * as TdTypes from "./td_types";
import { runInContext } from "vm";
import { addListener } from "cluster";

declare export interface TdClientActorOptions extends TdTypes.tdlibParameters$Input {
    /** Identifier between different TDLib instances. */
    identifier: string;
    /** The database encryption key.Usually the encryption key is never changed and is stored in some OS keychain. */
    database_encryption_key?: string; 
    poll_timeout?: number;
    polling_mode?: 'sync' | 'async' | 'fdpipe';
    /** Whether to enable built-in chat cache. Dramatically increase memory usage and speed up queries. */
    use_cache?: boolean;
}

declare export class TdClientActor extends EventEmitter {
    constructor(options: TdClientActorOptions);

    protected _closed: boolean;

    run: TdTypes.Invoke;

    addListener(event: 'ready' | 'closed', listener: () => void): this;
    on(event: 'ready' | 'closed', listener: () => void): this;
    once(event: 'ready' | 'closed', listener: () => void): this;


    addListener(event: string, listener: (data: TdTypes.Update | TdTypes.Error) => void): this;
    on(event: string, listener: (data: TdTypes.Update | TdTypes.Error) => void): this;
    once(event: string, listener: (data: TdTypes.Update | TdTypes.Error) => void): this;

    destroy(): void;

}

export as namespace TdClientActor;

const a = new TdClientActor()
const b = await a.run('acceptCall', { call_id: 12312 })
a.addListener()
