import { TdClientActor } from "./td_client_actor"
import * as BotAPITypes from "./bot_api_types"
import * as TDLibTypes from "./tdlib_types"

export default class {
    constructor(TdClient: TdClientActor);
    buildUser(user: TDLibTypes.user, out_full: boolean): Promise<BotAPITypes.IUser>;
    buildChat(chat: TDLibTypes.chat, out_full: boolean): Promise<BotAPITypes.IChat>;
    buildMessage(message: TDLibTypes.message, follow_replies_level: number): Promise<BotAPITypes.IMessage>;
    buildEntities(entities: TDLibTypes.TextEntities): Promise<BotAPITypes.IMessageEntity[]>;
    buildAnimation(animation: TDLibTypes.animation): Promise<BotAPITypes.IMediaDocument>;
    
}
