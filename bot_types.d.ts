import { TdClientActor } from "./td_client_actor"
import * as BotAPITypes from "./bot_api_types"
import * as TDLibTypes from "./tdlib_types"

export default class {
    constructor(TdClient: TdClientActor);
    buildUser(user: TDLibTypes.IUser, out_full: boolean): Promise<BotAPITypes.IUser>;
    
}
