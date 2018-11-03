import { Stream } from "stream";

export const enum EChatType {
    Private = "private",
    Group = "group",
    SuperGroup = "supergroup",
    Channel = "channel",
}

export const enum EChatAction {
    Typing = "typing",
    UploadingPhoto = "upload_photo",
    RecordingVideo = "record_video",
    UploadingVideo = "upload_video",
    RecordingAudio = "record_audio",
    UploadingAudio = "upload_audio",
    UploadingDocument = "upload_document",
    FindingLocation = "find_location",
    RecordingVideoNote = "record_video_note",
    UploadingVideoNote = "upload_video_note",
    FindingContact = "find_contact",
    PlayingName = "play_game",
}

/** Type of the entity. */
export enum EEntityType {
    /** @username */
    Mention = "mention",
    HashTag = "hashtag",
    CashTag = "cashtag",
    BotCommand = "bot_command",
    Url = "url",
    Email = "email",
    PhoneNumber = "phone_number",
    /** bold text */
    Bold = "bold",
    /** italic text */
    Italic = "italic",
    /** monowidth string */
    Code = "code",
    /** monowidth block */
    Preformatted = "pre",
    /** for clickable text URLs */
    TextLink = "text_link",
    /** for users without usernames */
    TextMention = "text_mention",
}

export enum EChatMemberStatus {
    Creator = "creator",
    Administrator = "administrator",
    Member = "member",
    Restricted = "restricted",
    Left = "left",
    Banned = "kicked"
}

export enum EParseMode {
    Markdown = "Markdown",
    HTML = "HTML"
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

/** This object represents an animation file (GIF or H.264/MPEG-4 AVC video without sound). */
export type Animation = {
    /**  */
    ***
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

/** This object represents an inline keyboard that appears right next to the message it belongs to. */
export type InlineKeyboardMarkup = {
    /** Array of button rows, each represented by an Array of InlineKeyboardButton objects */
    inline_keyboard: InlineKeyboardButton[][];
}

/** This object represents one button of an inline keyboard. You must use exactly one of the optional fields. */
export type InlineKeyboardButton = {
    /** Label text on the button */
    text: string;
    /** Optional. HTTP or tg:// url to be opened when button is pressed */
    url?: string;
    /** Optional. Data to be sent in a callback query to the bot when button is pressed, 1-64 bytes */
    callback_data?: string;
    /** 
     * Optional. If set, pressing the button will prompt the user to select one of their chats, open that chat and insert the bot‘s username and the specified inline query in the input field. Can be empty, in which case just the bot’s username will be inserted.
     *
     * Note: This offers an easy way for users to start using your bot in inline mode when they are currently in a private chat with it. Especially useful when combined with switch_pm… actions – in this case the user will be automatically returned to the chat they switched from, skipping the chat selection screen.
     */
    switch_inline_query?: string;
    /**
     * Optional. If set, pressing the button will insert the bot‘s username and the specified inline query in the current chat's input field. Can be empty, in which case only the bot’s username will be inserted.
     *
     * This offers a quick way for the user to open your bot in inline mode in the same chat – good for selecting something from multiple options.
     */
    switch_inline_query_current_chat?: string;
    /**
     * Optional. Description of the game that will be launched when the user presses the button.
     *
     * NOTE: This type of button must always be the first button in the first row.
     */
    callback_game?: CallbackGame;
    /**
     * Optional. Specify True, to send a Pay button.
     *
     * NOTE: This type of button must always be the first button in the first row.
     */
    pay?: boolean;
}

/** This object represents an incoming callback query from a callback button in an inline keyboard. If the button that originated the query was attached to a message sent by the bot, the field message will be present. If the button was attached to a message sent via the bot (in inline mode), the field inline_message_id will be present. Exactly one of the fields data or game_short_name will be present. */
export type CallbackQuery = {
    /** Unique identifier for this query */
    id: string;
    /** Sender */
    from: User;
    /** Optional. Message with the callback button that originated the query. Note that message content and message date will not be available if the message is too old */
    message?: Message;
    /** Optional. Identifier of the message sent via the bot in inline mode, that originated the query. */
    inline_message_id?: string;
    /** Global identifier, uniquely corresponding to the chat to which the message with the callback button was sent. Useful for high scores in games. */
    chat_instance: string;
    /** Optional. Data associated with the callback button. Be aware that a bad client can send arbitrary data in this field. */
    data?: string;
    /** Optional. Short name of a Game to be returned, serves as the unique identifier for the game */
    game_short_name: string;
}

/** Upon receiving a message with this object, Telegram clients will display a reply interface to the user (act as if the user has selected the bot‘s message and tapped ’Reply'). This can be extremely useful if you want to create user-friendly step-by-step interfaces without having to sacrifice privacy mode. */
export type ForceReply = {
    /** Shows reply interface to the user, as if they manually selected the bot‘s message and tapped ’Reply' */
    force_reply: true;
    /** Optional. Use this parameter if you want to force reply from specific users only. Targets: 1) users that are @mentioned in the text of the Message object; 2) if the bot's message is a reply (has reply_to_message_id), sender of the original message. */
    selective?: boolean;
}

/** This object represents a chat photo. */
export type ChatPhoto = {
    /** Unique file identifier of small (160x160) chat photo. This file_id can be used only for photo download. */
    small_file_id: string;
    /** Unique file identifier of big (640x640) chat photo. This file_id can be used only for photo download. */
    big_file_id: string;
}

/** This object contains information about one member of a chat. */
export type ChatMember = {
    /** Information about the user */
    user: User;
    /** The member's status in the chat. Can be “creator”, “administrator”, “member”, “restricted”, “left” or “kicked” */
    status: EChatMemberStatus;
    /** Optional. Restricted and kicked only. Date when restrictions will be lifted for this user, unix time */
    until_date?: number;
    /** Optional. Administrators only. True, if the bot is allowed to edit administrator privileges of that user */
    can_be_edited?: boolean;
    /** Optional. Administrators only. True, if the administrator can change the chat title, photo and other settings */
    can_change_info?: boolean;
    /** Optional. Administrators only. True, if the administrator can post in the channel, channels only */
    can_post_messages?: boolean;
    /** Optional. Administrators only. True, if the administrator can edit messages of other users and can pin messages, channels only */
    can_edit_messages?: boolean;
    /** Optional. Administrators only. True, if the administrator can delete messages of other users */
    can_delete_messages?: boolean;
    /** Optional. Administrators only. True, if the administrator can invite new users to the chat */
    can_invite_users?: boolean;
    /** Optional. Administrators only. True, if the administrator can restrict, ban or unban chat members */
    can_restrict_members?: boolean;
    /** Optional. Administrators only. True, if the administrator can pin messages, supergroups only */
    can_pin_messages?: boolean;
    /** Optional. Administrators only. True, if the administrator can add new administrators with a subset of his own privileges or demote administrators that he has promoted, directly or indirectly (promoted by administrators that were appointed by the user) */
    can_promote_members?: boolean;
    /** Optional. Restricted only. True, if the user can send text messages, contacts, locations and venues */
    can_send_messages?: boolean;
    /** Optional. Restricted only. True, if the user can send audios, documents, photos, videos, video notes and voice notes, implies can_send_messages */
    can_send_media_messages?: boolean;
    /** Optional. Restricted only. True, if the user can send animations, games, stickers and use inline bots, implies can_send_media_messages */
    can_send_other_messages?: boolean;
    /** Optional. Restricted only. True, if user may add web page previews to his messages, implies can_send_media_messages */
    can_add_web_page_previews?: boolean;
}

/** Contains information about why a request was unsuccessful. */
export type ResponseParameters = {
    /** Optional. The group has been migrated to a supergroup with the specified identifier. This number may be greater than 32 bits and some programming languages may have difficulty/silent defects in interpreting it. But it is smaller than 52 bits, so a signed 64 bit integer or double-precision float type are safe for storing this identifier. */
    migrate_to_chat_id?: number;
    /** Optional. In case of exceeding flood control, the number of seconds left to wait before the request can be repeated */
    retry_after?: number
}

/** This object represents the content of a media message to be sent.  */
export type InputMedia = InputMediaAnimation | InputMediaDocument | InputMediaAudio | InputMediaPhoto | InputMediaVideo

/** Represents a photo to be sent. */
export type InputMediaPhoto = {
    /** Type of the result, must be photo */
    type: "photo";
    /** File to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass a Stream or Buffer or File Path to upload the file.*/
    media: string | InputFile;
    /** Optional. Caption of the photo to be sent, 0-1024 characters */
    caption?: string;
    /** Optional. Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs in the media caption. */
    parse_mode?: EParseMode;
}

/** Represents a video to be sent. */
export type InputMediaVideo = {
    /** Type of the result, must be video */
    type: "video";
    /** File to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass a Stream or Buffer or File Path to upload the file.*/
    media: string | InputFile;
    /** Optional. Thumbnail of the file sent. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail‘s width and height should not exceed 90. Ignored if the file is not uploaded using multipart/form-data. Thumbnails can’t be reused and can be only uploaded as a new file, so you can pass a Stream or Buffer or File Path to upload the file.*/
    thumb?: InputFile;
    /** Optional. Caption of the video to be sent, 0-1024 characters */
    caption?: string;
    /** Optional. Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs in the media caption. */
    parse_mode?: EParseMode;
    /** Optional. Video width */
    width?: number;
    /** Optional. Video height */
    height?: number
    /** Optional. Video duration */
    duration?: number;
    /** Optional. Pass True, if the uploaded video is suitable for streaming */
    supports_streaming?: boolean;
}

/** Represents an animation file (GIF or H.264/MPEG-4 AVC video without sound) to be sent. */
export type InputMediaAnimation = {
    /** Type of the result, must be animation */
    type: "animation";
    /** File to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass a Stream or Buffer or File Path to upload the file.*/
    media: string | InputFile;
    /** Optional. Thumbnail of the file sent. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail‘s width and height should not exceed 90. Ignored if the file is not uploaded using multipart/form-data. Thumbnails can’t be reused and can be only uploaded as a new file, so you can pass a Stream or Buffer or File Path to upload the file.*/
    thumb?: InputFile;
    /** Optional. Caption of the animation to be sent, 0-1024 characters */
    caption?: string;
    /** Optional. Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs in the media caption. */
    parse_mode?: EParseMode;
    /** Optional. Animation width */
    width?: number;
    /** Optional. Animation height */
    height?: number
    /** Optional. Animation duration */
    duration?: number;
}

/** Represents an audio file to be treated as music to be sent. */
export type InputMediaAudio = {
    /** Type of the result, must be audio */
    type: "audio";
    /** File to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass a Stream or Buffer or File Path to upload the file.*/
    media: string | InputFile;
    /** Optional. Thumbnail of the file sent. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail‘s width and height should not exceed 90. Ignored if the file is not uploaded using multipart/form-data. Thumbnails can’t be reused and can be only uploaded as a new file, so you can pass a Stream or Buffer or File Path to upload the file.*/
    thumb?: InputFile;
    /** Optional. Caption of the audio to be sent, 0-1024 characters */
    caption?: string;
    /** Optional. Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs in the media caption. */
    parse_mode?: EParseMode;
    /** Optional. Duration of the audio in seconds */
    duration?: number;
    /** Optional. Performer of the audio */
    performer?: string;
    /** Optional. Title of the audio */
    title?: string;
}

/** Represents a general file to be sent. */
export type InputMediaDocument = {
    /** Type of the result, must be document */
    type: "document";
    /** File to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass a Stream or Buffer or File Path to upload the file.*/
    media: string | InputFile;
    /** Optional. Thumbnail of the file sent. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail‘s width and height should not exceed 90. Ignored if the file is not uploaded using multipart/form-data. Thumbnails can’t be reused and can be only uploaded as a new file, so you can pass a Stream or Buffer or File Path to upload the file.*/
    thumb?: InputFile;
    /** Optional. Caption of the document to be sent, 0-1024 characters */
    caption?: string;
    /** Optional. Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs in the media caption. */
    parse_mode?: EParseMode;
}

/** This object represents the contents of a file to be uploaded. Accepts Readable Stream, Buffer and Local file path. */
export type InputFile = ReadableStream | Buffer | string;

/** This object represents a game. Use BotFather to create and edit games, their short names will act as unique identifiers. */
export type Game = {
    /** Title of the game */
    title: string;
    /** Description of the game */
    description: string;
    /** Photo that will be displayed in the game message in chats. */
    photo: PhotoSize[];
    /** Optional. Brief description of the game or high scores included in the game message. Can be automatically edited to include current high scores for the game when the bot calls setGameScore, or manually edited using editMessageText. 0-4096 characters. */
    text?: string;
    /** Optional. Special entities that appear in text, such as usernames, URLs, bot commands, etc. */
    text_entities?: MessageEntity[];
    /** Optional. Animation that will be displayed in the game message in chats. Upload via BotFather */
    animation?: Animation;
}
