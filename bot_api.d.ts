import { TdClientActor } from "./td_client_actor";
import BotTypes from "./bot_types"

import * as BotAPITypes from "./bot_api_types"

interface IBotOptions {
    encrypt_callback_query?: boolean
}

export class Bot extends TdClientActor {
    public bot_id: number;
    protected _identifier: string;
    private _encrypt_callback_query: Buffer;
    public ready: boolean;
    private _inited_chat: Set<number>;
    protected conversion: BotTypes;
    constructor(api_id: number, api_hash: string, bot_token: string, use_test_dc?: boolean, identifier?: string | null, options?: IBotOptions | null);
    getMe(): Promise<BotAPITypes.IUser>;
    sendMessage(chat_id: number, text: string, options: {disable_web_page_preview: boolean; reply_to_message_id: number; disable_notification: boolean; reply_markup: BotAPITypes.TReplyMarkup}): Promise<BotAPITypes.IMessage>;

}
