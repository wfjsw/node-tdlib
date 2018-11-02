import { Invoice } from "./tdlib_types";

export enum EChatType {
    "private",
    "group",
    "supergroup",
    "channel",
}

export enum EChatAction {
    "typing",
    "upload_photo",
    "record_video",
    "upload_video",
    "record_audio",
    "upload_audio",
    "upload_document",
    "find_location",
    "record_video_note",
    "upload_video_note",
    "find_contact",
    "play_game",
}

/** Type of the entity. */
export enum EEntityType {
    /** @username */
    "mention",
    "hashtag",
    "cashtag",
    "bot_command",
    "url",
    "email",
    "phone_number",
    /** bold text */
    "bold",
    /** italic text */
    "italic",
    /** monowidth string */
    "code",
    /** monowidth block */
    "pre",
    /** for clickable text URLs */
    "text_link",
    /** for users without usernames */
    "text_mention",
}

/** This object represents a Telegram user or bot. */
export type User = {
    /** Unique identifier for this user or bot */
    id: number;
    /** True, if this user is a bot */
    is_bot: boolean;
    /** User‘s or bot’s first name */
    first_name: string;
    /** Optional. User‘s or bot’s last name */
    last_name?: string;
    /** Optional. User‘s or bot’s username */
    username?: string;
    /** Optional. IETF language tag of the user's language */
    language_code?: string;
}

/** This object represents a chat. */
export type Chat = {
    /** Unique identifier for this chat. This number may be greater than 32 bits and some programming languages may have difficulty/silent defects in interpreting it. But it is smaller than 52 bits, so a signed 64 bit integer or double-precision float type are safe for storing this identifier. */
    id: number;
    /** Type of chat, can be either “private”, “group”, “supergroup” or “channel” */
    type: EChatType;
    /** Optional. Title, for supergroups, channels and group chats */
    title?: string;
    /** Optional. Username, for private chats, supergroups and channels if available */
    username?: string;
    /** Optional. First name of the other party in a private chat */
    first_name?: string;
    /** Optional. Last name of the other party in a private chat */
    last_name?: string;
    /** Optional. True if a group has ‘All Members Are Admins’ enabled. */
    all_members_are_administrators?: boolean;
    /** Optional. Chat photo. Returned only in getChat. */
    photo?: ChatPhoto;
    /** Optional. Description, for supergroups and channel chats. Returned only in getChat. */
    description?: string;
    /** Optional. Chat invite link, for supergroups and channel chats. Returned only in getChat. */
    invite_link?: string;
    /** Optional. Pinned message, for supergroups and channel chats. Returned only in getChat. */
    pinned_message?: Message;
    /** Optional. For supergroups, name of group sticker set. Returned only in getChat. */
    sticker_set_name?: string;
    /** Optional. True, if the bot can change the group sticker set. Returned only in getChat. */
    can_set_sticker_set?: boolean;
}

/** This object represents a message. */
export type Message = {
    /** Unique message identifier inside this chat */
    message_id: number;
    /** Optional. Sender, empty for messages sent to channels */
    from?: User;
    /** Date the message was sent in Unix time */
    date: number;
    /** Conversation the message belongs to */
    chat: Chat;
    /** Optional. For forwarded messages, sender of the original message */
    forward_from?: User;
    /** Optional. For messages forwarded from channels, information about the original channel */
    forward_from_chat?: Chat;
    /** Optional. For messages forwarded from channels, identifier of the original message in the channel */
    forward_from_message_id?: number;
    /** Optional. For messages forwarded from channels, signature of the post author if present */
    forward_signature?: string;
    /** Optional. For forwarded messages, date the original message was sent in Unix time */
    forward_date?: number;
    /** Optional. For replies, the original message. Note that the Message object in this field will not contain further reply_to_message fields even if it itself is a reply. */
    reply_to_message?: Message;
    /** Optional. Date the message was last edited in Unix time */
    edit_date?: number;
    /** Optional. The unique identifier of a media message group this message belongs to */
    media_group_id?: string;
    /** Optional. Signature of the post author for messages in channels */
    author_signature?: string;
    /** Optional. For text messages, the actual UTF-8 text of the message, 0-4096 characters. */
    text?: string;
    /** Optional. For text messages, special entities like usernames, URLs, bot commands, etc. that appear in the text */
    entities?: MessageEntity[];
    /** Optional. For messages with a caption, special entities like usernames, URLs, bot commands, etc. that appear in the caption */
    caption_entities?: MessageEntity[];
    /** Optional. Message is an audio file, information about the file */
    audio?: Audio;
    /** Optional. Message is a general file, information about the file */
    document?: Document;
    /** Optional. Message is an animation, information about the animation. For backward compatibility, when this field is set, the document field will also be set */
    animation?: Animation;
    /** Optional. Message is a game, information about the game.  */
    game?: Game;
    /** Optional. Message is a photo, available sizes of the photo */
    photo?: PhotoSize[];
    /** Optional. Message is a sticker, information about the sticker */
    sticker?: Sticker;
    /** Optional. Message is a video, information about the video */
    video?: Video;
    /** Optional. Message is a voice message, information about the file */
    voice?: Voice;
    /** Optional. Message is a video note, information about the video message */
    video_note?: VideoNote;
    /** Optional. Caption for the audio, document, photo, video or voice, 0-1024 characters */
    caption?: string;
    /** Optional. Message is a shared contact, information about the contact */
    contact?: Contact;
    /** Optional. Message is a shared location, information about the location */
    location?: Location;
    /** Optional. Message is a venue, information about the venue */
    venue?: Venue;
    /** Optional. New members that were added to the group or supergroup and information about them (the bot itself may be one of these members) */
    new_chat_members?: User[];
    new_chat_member?: User;
    /** Optional. A member was removed from the group, information about them (this member may be the bot itself) */
    left_chat_member?: User;
    /** Optional. A chat title was changed to this value */
    new_chat_title?: string;
    /** Optional. A chat photo was change to this value */
    new_chat_photo?: PhotoSize[];
    /** Optional. Service message: the chat photo was deleted */
    delete_chat_photo?: boolean;
    /** Optional. Service message: the group has been created */
    group_chat_created?: boolean;
    /** Optional. Service message: the supergroup has been created. This field can‘t be received in a message coming through updates, because bot can’t be a member of a supergroup when it is created. It can only be found in reply_to_message if someone replies to a very first message in a directly created supergroup. */
    supergroup_chat_created?: boolean;
    /** Optional. Service message: the channel has been created. This field can‘t be received in a message coming through updates, because bot can’t be a member of a channel when it is created. It can only be found in reply_to_message if someone replies to a very first message in a channel. */
    channel_chat_created?: boolean;
    /** Optional. The group has been migrated to a supergroup with the specified identifier. This number may be greater than 32 bits and some programming languages may have difficulty/silent defects in interpreting it. But it is smaller than 52 bits, so a signed 64 bit integer or double-precision float type are safe for storing this identifier. */
    migrate_to_chat_id?: number;
    /** Optional. The supergroup has been migrated from a group with the specified identifier. This number may be greater than 32 bits and some programming languages may have difficulty/silent defects in interpreting it. But it is smaller than 52 bits, so a signed 64 bit integer or double-precision float type are safe for storing this identifier. */
    migrate_from_chat_id?: number;
    /** Optional. Specified message was pinned. Note that the Message object in this field will not contain further reply_to_message fields even if it is itself a reply. */
    pinned_message?: Message;
    /** Optional. Message is an invoice for a payment, information about the invoice.  */
    invoice?: Invoice;
    /** Optional. Message is a service message about a successful payment, information about the payment.  */
    successful_payment?: SuccessfulPayment;
    /** Optional. The domain name of the website on which the user has logged in.  */
    connected_website?: string;
    /** Optional. Telegram Passport data */
    passport_data?: PassportData;
}

/** This object represents one special entity in a text message. For example, hashtags, usernames, URLs, etc. */
export type MessageEntity = {
    /** Type of the entity. Can be mention (@username), hashtag, cashtag, bot_command, url, email, phone_number, bold (bold text), italic (italic text), code (monowidth string), pre (monowidth block), text_link (for clickable text URLs), text_mention (for users without usernames) */
    type: EEntityType;
    /** Offset in UTF-16 code units to the start of the entity */
    offset: number;
    /** Length of the entity in UTF-16 code units */
    length: number;
    /** Optional. For “text_link” only, url that will be opened after user taps on the text */
    url?: string;
    /** Optional. For “text_mention” only, the mentioned user */
    user?: User;
}

/** This object represents one size of a photo or a file / sticker thumbnail. */
export type PhotoSize = {
    /** Unique identifier for this file */
    file_id: string;
    /** Photo width */
    width: number;
    /** Photo height */
    height: number;
    /** Optional. File size */
    file_size?: number;
}

/** This object represents an audio file to be treated as music by the Telegram clients. */
export type Audio = {
    /** Unique identifier for this file */
    file_id: string;
    /** Duration of the audio in seconds as defined by sender */
    duration: number;
    /** Optional. Performer of the audio as defined by sender or by audio tags */
    performer?: string;
    /** Optional. Title of the audio as defined by sender or by audio tags */
    title?: string;
    /** Optional. MIME type of the file as defined by sender */
    mime_type?: string;
    /** Optional. File size */
    file_size?: number;
    /** Optional. Thumbnail of the album cover to which the music file belongs */
    thumb?: PhotoSize;
}

/** This object represents a general file (as opposed to photos, voice messages and audio files). */
export type Document = {
    /** Unique file identifier */
    file_id: string;
    /** Optional. Document thumbnail as defined by sender */
    thumb?: PhotoSize;
    /** Optional. Original filename as defined by sender */
    file_name?: string;
    /** Optional. MIME type of the file as defined by sender */
    mime_type?: string;
    /** Optional. File size */
    file_size?: number;
}

/** This object represents a video file. */
export type Video = {
    /** Unique identifier for this file */
    file_id: string;
    /** Video width as defined by sender */
    width: number;
    /** Video height as defined by sender */
    height: number;
    /** Duration of the video in seconds as defined by sender */
    duration: number;
    /** Optional. Video thumbnail */
    thumb?: PhotoSize;
    /** Optional. Original animation filename as defined by sender */
    file_name?: string;
    /** Optional. MIME type of the file as defined by sender */
    mime_type?: string;
    /** Optional. File size */
    file_size?: number;
}

/** This object represents a voice note. */
export type Voice = {
    /** Unique identifier for this file */
    file_id: string;
    /** Duration of the audio in seconds as defined by sender */
    duration?: number;
    /** Optional. MIME type of the file as defined by sender */
    mime_type?: string;
    /** Optional. File size */
    file_size?: number;
}

/** This object represents a video message (available in Telegram apps as of v.4.0). */
export type VideoNote = {
    /** Unique identifier for this file */
    file_id: string;
    /** Video width and height (diameter of the video message) as defined by sender */
    length: number;
    /** Duration of the video in seconds as defined by sender */
    duration: number;
    /** Optional. Video thumbnail */
    thumb?: PhotoSize;
    /** Optional. File size */
    file_size?: number;
}

/** This object represents a phone contact. */
export type Contact = {
    /** Contact's phone number */
    phone_number: string;
    /** Contact's first name */
    first_name: string;
    /** Optional. Contact's last name */
    last_name?: string;
    /** Optional. Contact's user identifier in Telegram */
    user_id?: number;
    /** Optional. Additional data about the contact in the form of a vCard */
    vcard?: string;
}

/** This object represents a point on the map. */
export type Location = {
    /** Longitude as defined by sender */
    longitude: number;
    /** Latitude as defined by sender */
    latitude: number;
}

/** This object represents a venue. */
export type Venue = {
    /** Venue location */
    location: Location;
    /** Name of the venue */
    title: string;
    /** Address of the venue */
    address: string;
    /** Optional. Foursquare identifier of the venue */
    foursquare_id?: string;
    /** Optional. Foursquare type of the venue. (For example, “arts_entertainment/default”, “arts_entertainment/aquarium” or “food/icecream”.) */
    foursquare_type?: string;
}

/** This object represent a user's profile pictures. */
export type UserProfilePhotos = {
    /** Total number of profile pictures the target user has */
    total_count: number;
    /** Requested profile pictures (in up to 4 sizes each) */
    photos: PhotoSize[][];
}

/** This object represents a file ready to be downloaded. */
export type File = {
    /** Unique identifier for this file */
    file_id: string;
    /** Optional. File size, if known */
    file_size?: number;
    /** Optional. File path. */
    file_path?: string;
}

/** This object represents a custom keyboard with reply options (see Introduction to bots for details and examples). */
export type ReplyKeyboardMarkup = {
    /** Array of button rows, each represented by an Array of KeyboardButton objects */
    keyboard: KeyboardButton[][];
    /** Optional. Requests clients to resize the keyboard vertically for optimal fit (e.g., make the keyboard smaller if there are just two rows of buttons). Defaults to false, in which case the custom keyboard is always of the same height as the app's standard keyboard. */
    resize_keyboard?: boolean;
    /** Optional. Requests clients to hide the keyboard as soon as it's been used. The keyboard will still be available, but clients will automatically display the usual letter-keyboard in the chat – the user can press a special button in the input field to see the custom keyboard again. Defaults to false. */
    one_time_keyboard?: boolean;
    /** Optional. Use this parameter if you want to show the keyboard to specific users only. Targets: 1) users that are @mentioned in the text of the Message object; 2) if the bot's message is a reply (has reply_to_message_id), sender of the original message.
     * 
     *  Example: A user requests to change the bot‘s language, bot replies to the request with a keyboard to select the new language. Other users in the group don’t see the keyboard. */
    selective?: boolean;
}

/** This object represents one button of the reply keyboard. For simple text buttons String can be used instead of this object to specify text of the button. Optional fields are mutually exclusive. */
export type KeyboardButton = {
    /** Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed */
    text: string;
    /** Optional. If True, the user's phone number will be sent as a contact when the button is pressed. Available in private chats only */
    request_contact?: boolean;
    /** Optional. If True, the user's current location will be sent when the button is pressed. Available in private chats only */
    request_location?: boolean;
}

/** Upon receiving a message with this object, Telegram clients will remove the current custom keyboard and display the default letter-keyboard. By default, custom keyboards are displayed until a new keyboard is sent by a bot. An exception is made for one-time keyboards that are hidden immediately after the user presses a button (see ReplyKeyboardMarkup). */
export type ReplyKeyboardRemove = {
    /** Requests clients to remove the custom keyboard (user will not be able to summon this keyboard; if you want to hide the keyboard from sight but keep it accessible, use one_time_keyboard in ReplyKeyboardMarkup) */
    remove_keyboard: true;
    /** Optional. Use this parameter if you want to remove the keyboard for specific users only. Targets: 1) users that are @mentioned in the text of the Message object; 2) if the bot's message is a reply (has reply_to_message_id), sender of the original message.
     *
     *  Example: A user votes in a poll, bot returns confirmation message in reply to the vote and removes the keyboard for that user, while still showing the keyboard with poll options to users who haven't voted yet. */
    selective?: boolean;
}
