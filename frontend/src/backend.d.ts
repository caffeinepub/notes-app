import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Note {
    id: NoteId;
    title: string;
    content: string;
    imageRefs: Array<ExternalBlob>;
    encrypted: boolean;
    timestamp: bigint;
}
export type NoteId = string;
export interface NoteData {
    title: string;
    content: string;
    imageRefs: Array<ExternalBlob>;
    encrypted: boolean;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createNote(data: NoteData): Promise<Note>;
    deleteNote(noteId: NoteId): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getNote(noteId: NoteId): Promise<Note>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listNotes(): Promise<Array<Note>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateNote(noteId: NoteId, data: NoteData): Promise<Note>;
}
