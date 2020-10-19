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
  data: FirebaseFirestore.DocumentData
): CalendarEntry => {
  const doc = data.data();
  return {
    key: data.id,
    typeId: doc.typeId,
    window: {
      starts: new Date(doc.window.starts.seconds * 1000),
      ends: new Date(doc.window.ends.seconds * 1000)
    },
    title: doc.title,
    description: doc.description,
    contacts: doc.contacts
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

export type DataType = {
  key?: string;
  title: string;
  color: string;
};

export type DataTypesType = {
  [id: string]: DataType;
};

export const convertDocumentDataToDataType = (
  data: FirebaseFirestore.DocumentData
): DataType => {
  const doc = data.data();
  return {
    key: data.id,
    title: doc.title,
    color: doc.color
  };
};

export type Contact = {
  key?: string;
  created?: Date;
  typeId?: string;
  name: string;
  number?: string;
  email?: string;
  location?: string;
  description?: string;
};

export type ContactsType = {
  [id: string]: Contact;
};

export const convertDocumentDataToContact = (
  data: FirebaseFirestore.DocumentData
): Contact => {
  const doc = data.data();
  const contactData: Contact = {
    key: data.id,
    created:
      doc.created &&
      doc.created.seconds &&
      new Date(doc.created.seconds * 1000),
    typeId: doc.typeId,
    name: doc.name,
    number: doc.number,
    email: doc.email,
    location: doc.location,
    description: doc.description
  };
  if (doc.created && doc.created.seconds) {
    contactData.created = new Date(doc.created.seconds * 1000);
  }
  return contactData;
};

export type Medication = {
  key?: string;
  created?: Date;
  typeId?: string;
  name: string;
  active: boolean;
  prescribed?: string;
  lastFilled?: Date;
  refills?: number;
  description?: string;
};

export type MedicationsType = {
  [id: string]: Medication;
};

export const convertDocumentDataToMedication = (
  data: FirebaseFirestore.DocumentData
): Medication => {
  const doc = data.data();
  const medicaitonData: Medication = {
    key: data.id,
    created:
      doc.created &&
      doc.created.seconds &&
      new Date(doc.created.seconds * 1000),
    typeId: doc.typeId,
    name: doc.name,
    active: doc.active,
    prescribed: doc.prescribed, // ContactID
    lastFilled:
      doc.lastFilled &&
      doc.lastFilled.seconds &&
      new Date(doc.lastFilled.seconds * 1000),
    refills: doc.refills,
    description: doc.description
  };
  if (doc.created && doc.created.seconds) {
    medicaitonData.created = new Date(doc.created.seconds * 1000);
  }
  return medicaitonData;
};

export type PainLogLocation = {
  key?: string;
  created?: Date;
  typeId?: string;
  position?: {
    x: number;
    y: number;
  };
  title?: string;
  active?: boolean;
  description?: string;
  severity?: number;
  medications?: Array<string>;
  previous?: string;
  next?: string;
};

export type PainLogType = {
  [id: string]: PainLogLocation;
};

export const convertDocumentDataToPainLogLocation = (
  data: FirebaseFirestore.DocumentData
): PainLogLocation => {
  const doc = data.data();
  const painLogLocationData: PainLogLocation = {
    key: data.id,
    created:
      doc.created &&
      doc.created.seconds &&
      new Date(doc.created.seconds * 1000),
    typeId: doc.typeId,
    title: doc.title,
    active: doc.active,
    description: doc.description,
    severity: doc.severity,
    medications: doc.medications,
    next: doc.next,
    previous: doc.previous
  };
  if (doc.position) {
    painLogLocationData.position = doc.position;
  }
  return painLogLocationData;
};
