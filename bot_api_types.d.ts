export interface IProfilePhoto {
    small_file_id: string;
    big_file_id: string
}

export interface IBotCommand {
    command: string;
    description: string;
}

export interface IBotOptions {
    description?: string;
    commands: IBotCommand[];
    can_join_groups: boolean;
    can_read_all_group_message: boolean;
    is_inline: boolean;
    inline_query_placeholder: string;
    need_location: boolean;
}

export interface IUser {
    id: number,
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    restriction_reason: string;
    is_verified: boolean;
    phone_number?: string;
    is_bot: boolean;
    photo?: IProfilePhoto;
    last_seen: number;
    type: string;
    bot_options: IBotOptions;
    description: string;
    group_in_common_count: number;
}
