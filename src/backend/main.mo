import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import BlobStorage "blob-storage/Storage";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import List "mo:core/List";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type NoteId = Text;
  type BlobId = Text;

  type Note = {
    id : NoteId;
    title : Text;
    content : Text;
    encrypted : Bool;
    timestamp : Int;
    imageRefs : [BlobStorage.ExternalBlob];
  };

  type NoteData = {
    title : Text;
    content : Text;
    encrypted : Bool;
    imageRefs : [BlobStorage.ExternalBlob];
  };

  public type UserProfile = {
    name : Text;
  };

  module Note {
    public func compareByTimestamp(note1 : Note, note2 : Note) : Order.Order {
      Int.compare(note1.timestamp, note2.timestamp);
    };
  };

  let emptyNotesMap = Map.empty<Principal, Map.Map<NoteId, Note>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextNoteId = 0;

  // User profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Note CRUD operations
  public query ({ caller }) func listNotes() : async [Note] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can list notes");
    };

    switch (emptyNotesMap.get(caller)) {
      case (null) { [] };
      case (?userNotes) {
        userNotes.values().toArray().sort(Note.compareByTimestamp);
      };
    };
  };

  public query ({ caller }) func getNote(noteId : NoteId) : async Note {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view notes");
    };

    switch (emptyNotesMap.get(caller)) {
      case (null) { Runtime.trap("Note does not exist") };
      case (?userNotes) {
        switch (userNotes.get(noteId)) {
          case (null) { Runtime.trap("Note does not exist") };
          case (?note) { note };
        };
      };
    };
  };

  public shared ({ caller }) func createNote(data : NoteData) : async Note {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create notes");
    };

    let noteId = nextNoteId.toText();
    nextNoteId += 1;
    let note : Note = {
      id = noteId;
      title = data.title;
      content = data.content;
      encrypted = data.encrypted;
      timestamp = Time.now();
      imageRefs = data.imageRefs;
    };

    let userNotes = switch (emptyNotesMap.get(caller)) {
      case (null) {
        let newMap = Map.empty<NoteId, Note>();
        newMap.add(noteId, note);
        newMap;
      };
      case (?existing) {
        existing.add(noteId, note);
        existing;
      };
    };

    emptyNotesMap.add(caller, userNotes);
    note;
  };

  public shared ({ caller }) func updateNote(noteId : NoteId, data : NoteData) : async Note {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update notes");
    };

    let userNotes = switch (emptyNotesMap.get(caller)) {
      case (null) {
        Runtime.trap("Note does not exist");
      };
      case (?existing) { existing };
    };

    let updatedNote = switch (userNotes.get(noteId)) {
      case (null) { Runtime.trap("Note does not exist") };
      case (?existing) {
        {
          existing with
          title = data.title;
          content = data.content;
          encrypted = data.encrypted;
          imageRefs = data.imageRefs;
        };
      };
    };

    userNotes.add(noteId, updatedNote);
    updatedNote;
  };

  public shared ({ caller }) func deleteNote(noteId : NoteId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete notes");
    };

    let userNotes = switch (emptyNotesMap.get(caller)) {
      case (null) {
        Runtime.trap("Note does not exist");
      };
      case (?existing) { existing };
    };

    userNotes.remove(noteId);
  };
};
