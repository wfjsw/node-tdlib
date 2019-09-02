import { ChatPhoto } from "./botapi_types";

declare export type BotOptions = {
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
    is_inline: boolean;
    inline_query_placeholder: string;
    need_location: boolean;
    /** Predefined bot commands. Only in full request. */
    commands?: BotCommand[];
    /** The "About Bot" section of bot. Only in full request. */
    description?: string;
}

declare export type BotCommand = {
    command: string;
    description: string;
}

declare export type User = {
    /**
     * If non-empty, it contains the reason why access to this user must be restricted.
     * The format of the string is "{type}: {description}". {type} contains the type of
     * the restriction and at least one of the suffixes "-all", "-ios", "-android", or "-wp",
     * which describe the platforms on which access should be restricted. (For example,
     * "terms-ios-android". {description} contains a human-readable description of the restriction,
     * which can be shown to the user)
     */
    restriction_reason: string
    /** True, if the user is verified */
    is_verified: boolean;
    /** True, if the user is Telegram support account.  */
    is_support: boolean;
    /** Phone number of the user */
    phone_number: string;
    /** Current profile photo of the user */
    photo?: ChatPhoto;
    /**
     * User last seen:  
     * -5: long time ago  
     * -4: last month  
     * -3: last week  
     * -2: recently  
     * -1: currently online  
     * 0 - max_int: last seen on timestamp  
    */
    last_seen: -5 | -4 | -3 | -2 | -1 | number;
    /** User type */
    type: 'user' | 'bot' | 'deleted'
    bot_options?: BotOptions;
    /** User bio. Only in full request. */
    description?: string;
    group_in_common_count?: number;
}

export as namespace BotAPITypes$Extended;
