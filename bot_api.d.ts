import { TdClientActor, TdClientActorOptions } from "./td_client_actor"

declare export class Bot extends TdClientActor {
    constructor(api_id: number, api_hash: string, bot_token: string, use_test_dc = false, identifier?: string = null, options: TdClientActorOptions);

}
