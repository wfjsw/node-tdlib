import { TdClientActor } from "./td_client_actor";
import BotTypes from "./bot_types"

import * as BotAPITypes from "./bot_api_types"

interface IBotOptions {
    encrypt_callback_query?: boolean
}

export default class Bot extends TdClientActor {
    public bot_id: number;
    protected _identifier: string;
    private _encrypt_callback_query: Buffer;
    public ready: boolean;
    private _inited_chat: Set<number>;
    protected conversion: BotTypes;
    constructor(api_id: number, api_hash: string, bot_token: string, use_test_dc: boolean, identifier: string | null, options: IBotOptions | null);
    getMe();
}
