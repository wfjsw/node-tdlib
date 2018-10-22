export interface IUserStatusEmpty {
    "@type": string = "userStatusEmpty";
}

export interface IUserStatusLastMonth {
    "@type": string = "userStatusLastMonth";
}

export interface IUserStatusLastWeek {
    "@type": string = "userStatusLastWeek";
}

export interface IUserStatusOffline {
    "@type": string = "userStatusOffline";
    was_online: number;
}

export interface IUserStatusOnline {
    "@type": string = "userStatusOnline";
    expires: number;
}

export interface IUserStatusRecently {
    "@type": string = "userStatusRecently";
}

export type TUserStatus = IUserStatusEmpty | IUserStatusLastMonth | IUserStatusLastWeek | IUserStatusOffline | IUserStatusOnline | IUserStatusRecently; 

export interface IProfilePhoto {
    "@type": string = "profilePhoto";
    id: number;
    small: IFile;
    big: IFile;
}

export interface ILinkStateIsContact {
    "@type": string = "linkStateIsContact";
}

export interface ILinkStateKnowsPhoneNumber {
    "@type": string = "linkStateKnowsPhoneNumber";
}

export interface ILinkStateNone {
    "@type": string = "linkStateNone";
}

export type TLinkState = ILinkStateIsContact | ILinkStateKnowsPhoneNumber | ILinkStateNone;

export interface IUserTypeBot {
    "@type": string = "userTypeBot";
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
    is_inline: boolean;
    inline_query_placeholder: string;
    need_location: boolean;
}

export interface IUserTypeDeleted {
    "@type": string = "userTypeDeleted";
}

export interface IUserTypeRegular {
    "@type": string = "userTypeRegular";
}

export interface IUserTypeUnknown {
    "@type": string = "userTypeUnknown";
}

export type TUserType = IUserTypeBot | IUserTypeDeleted | IUserTypeRegular | IUserTypeUnknown;

export interface IUser {
    "@type": string = "user";
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    phone_number?: string;
    status: TUserStatus;
    profile_photo: IProfilePhoto;
    outgoing_link: TLinkState;
    incoming_link: TLinkState;
    is_verified: boolean;
    restriction_reason: string;
    have_access: boolean;
    type: TUserType;
    language_code: string;
}

