export enum PostPrivacyTypes {
  'PUBLIC' = 0,
  'PRIVATE' = 1,
  'FRIENDS' = 2,
  'PUBLICANDFRIENDS' = 3,
}

export type PostCriteria = {
  key?: {
    id: string;
    type: 'posts' | 'comments' | 'messages';
  };
  privacy: PostPrivacyTypes;
};

export type Post = {
  key: string,
  body: string,
  tags: Array<string>,
  criteria: PostCriteria,
  created: {
    by: string,
    on: Date,
    from?: string
  },
}

export const convertDocumentDataToPost = (
  data: FirebaseFirestore.DocumentData
): Post => {
  const doc = data.data()
  const postData: Post = {
    key: data.id,
    body: doc.body,
    tags: doc.tags,
    criteria: doc.criteria,
    created: {
      by: doc.created.by,
      on: new Date(doc.created.on.seconds * 1000)
    }
  }
  return postData
}

export type Tag = {
  key?: string;
  name: string;
  path?: string;
  created?: {
    by: string;
    on: Date;
    from?: string;
  };
  //searchableIndex?: { [key: string]: boolean }
};

export type UserTag = {
  key?: string;
  name: string;
  tagId: string;
};

export const convertDocumentDataToTag = (
  data: FirebaseFirestore.DocumentData
): Tag => {
  const doc = data.data();
  return {
    key: data.id,
    name: doc.name,
    path: doc.path
    // don't add in create or searchableIndex, as that's just for server-side stuff
  };
};

export const convertDocumentDataToUserTag = (
  data: FirebaseFirestore.DocumentData
): UserTag => {
  const doc = data.data();
  return {
    key: data.id,
    name: doc.name,
    tagId: doc.tagId
  };
};

export type User =
  | {
      uid: string;
      email: string;
      displayName?: string;
      photoURL?: URL;
      public?: {
        [item: string]: boolean;
      };
      tags?: Array<string>;
    }
  | false;

  export type UserUser = {
    uid?: string;
    email: string;
    displayName?: string;
    photoURL?: URL;
    public?: {
      [item: string]: boolean;
    };
    tags?: Array<string>;
  };

  export const firebaseUserDocumentToUser = (
    uid: string,
    userDocument: FirebaseFirestore.DocumentData
  ) => {
    const {email, displayName, photoURL, tags} = userDocument;
    const data: User = {
      uid,
      email,
      displayName,
      photoURL: photoURL && photoURL.length > 0 ? new URL(photoURL) : undefined,
      public: userDocument.public,
      tags
    };
    return data;
  };
  
export const convertDocumentDataToCalendarEntry = (
  data: FirebaseFirestore.DocumentData,
): CalendarEntry => {
  const doc = data.data();
  return {
    key: data.id,
    typeId: doc.typeId,
    window: {
      starts: new Date(doc.window.starts.seconds * 1000),
      ends: new Date(doc.window.ends.seconds * 1000),
    },
    title: doc.title,
    description: doc.description,
    contacts: doc.contacts,
  };
};

export type CalendarWindow = {
  starts: Date;
  ends: Date;
};

export type CalendarEntry = {
  key?: string;
  typeId?: string;
  window: CalendarWindow;
  title: string;
  description?: string;
  contacts?: Array<string>;
};

export type CalendarRecord = {
  window: CalendarWindow;
  items: Array<CalendarEntry>;
};

export type CalendarType = {
  [id: string]: CalendarEntry;
};

export type CalendarState = {
  dates: CalendarType;
};
