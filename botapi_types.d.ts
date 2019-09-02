/**
 * This object represents an incoming update.
 * At most one of the optional parameters can be present in any given update.
 */
declare export type Update = {
    /** The update‘s unique identifier. Update identifiers start from a certain positive number and increase sequentially. This ID becomes especially handy if you’re using Webhooks, since it allows you to ignore repeated updates or to restore the correct update sequence, should they get out of order. If there are no new updates for at least a week, then identifier of the next update will be chosen randomly instead of sequentially. */
    update_id: number;
    /** Optional. New incoming message of any kind — text, photo, sticker, etc. */
    message?: Message;
    /** Optional. New version of a message that is known to the bot and was edited */
    edited_message?: Message;
    /** Optional. New incoming channel post of any kind — text, photo, sticker, etc. */
    channel_post?: Message;
    /** Optional. New version of a channel post that is known to the bot and was edited */
    edited_channel_post?: Message;
    /** Optional. New incoming inline query */
    inline_query?: InlineQuery;
    /** Optional. The result of an inline query that was chosen by a user and sent to their chat partner. Please see our documentation on the feedback collecting for details on how to enable these updates for your bot. */
    chosen_inline_result?: ChosenInlineResult;
    /** Optional. New incoming callback query */
    callback_query?: CallbackQuery;
    /** Optional. New incoming shipping query. Only for invoices with flexible price */
    shipping_query?: ShippingQuery;
    /** Optional. New incoming pre-checkout query. Contains full information about checkout */
    pre_checkout_query?: PreCheckoutQuery;
    /** Optional. New poll state. Bots receive only updates about polls, which are sent or stopped by the bot */
    poll?: Poll;
}

/**
 * This object represents a Telegram user or bot.
 */
declare export type User = {
    /** Unique identifier for this user or bot */
    id: number;
    /** True, if this user is a bot */
    is_bot: boolean;
    /** User‘s or bot’s first name */
    first_name: string;
    /** Optional. User‘s or bot’s last name */
    last_name: string;
    /** Optional. User‘s or bot’s username */
    username: string;
    /** Optional. IETF language tag of the user's language */
    language_code: string;
}

/**
 * This object represents a chat photo.
 */
declare export type ChatPhoto = {
    /** Unique file identifier of small (160x160) chat photo. This file_id can be used only for photo download. */
    small_file_id: string;
    /** Unique file identifier of big (640x640) chat photo. This file_id can be used only for photo download. */
    big_file_id: string;
}

export as namespace BotAPITypes;
