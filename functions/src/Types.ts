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
