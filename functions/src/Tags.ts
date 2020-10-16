import * as admin from 'firebase-admin';
import { convertDocumentDataToTag, convertDocumentDataToUserTag, Tag } from './Types';

export const getTagsForAutocomplete = (
  prefix: string,
  tagIdsInUse: Array<string>,
  limit = 5,
  minimumCharacters = 3
) => {
  const db = admin.firestore();
  return new Promise<Array<Tag>>((resolve, reject) => {
    if (!prefix || prefix.length < minimumCharacters) {
      resolve(new Array<Tag>());
    } else if (tagIdsInUse.length > 0) {
      db.collection('tags')
        .where('name', '>=', prefix)
        .where(FirebaseFirestore.FieldPath.documentId(), 'not-in', tagIdsInUse)
        .limit(limit)
        .get()
        .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
          const arr = querySnapshot.docs.map((d) => {
            const val = convertDocumentDataToTag(d);
            return val;
          });
          resolve(arr);
        })
        .catch((err: Error) => reject(err));
    } else {
      db.collection('tags')
        .where('name', '>=', prefix)
        .limit(limit)
        .get()
        .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
          const arr = querySnapshot.docs.map((d) => {
            const val = convertDocumentDataToTag(d);
            return val;
          });
          resolve(arr);
        })
        .catch((err) => reject(err));
    }
  });
};

export const getTagsByKeyArray = (
  tagIds: Array<string>
) => {
  const db = admin.firestore();
  return new Promise<Array<Tag>>((resolve, reject) => {
    if (tagIds.length === 0) {
      setTimeout(() => {
        const arr = new Array<Tag>();
        resolve(arr);
      }, 1000);
    } else {
      db.collection('tags')
        .where(FirebaseFirestore.FieldPath.documentId(), 'in', tagIds)
        .get()
        .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
          const arr = querySnapshot.docs.map((d) => {
            const val = convertDocumentDataToTag(d);
            return val;
          });
          resolve(arr);
        })
        .catch((e) => reject(e));
    }
  });
};

export const getTagIdsForUser = (
  userId?: string
) => {
  const db = admin.firestore();
  return new Promise<Array<string>>((resolve, reject) => {
    if (!userId) {
      resolve(new Array<string>());
    } else {
      db.collection('users')
        .doc(userId)
        .collection('tags')
        .get()
        .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
          const userTags = querySnapshot.docs.map((tagIdDoc) =>
            convertDocumentDataToUserTag(tagIdDoc)
          );
          const userTagIds = userTags.map((ut) => ut.tagId);
          resolve(userTagIds);
        })
        .catch(reject);
    }
  });
};

export const addTag = (
  user: admin.auth.DecodedIdToken,
  tag: Tag,
  ipAddress?: string
) => {
  const db = admin.firestore();
  return new Promise<Tag>((resolve, reject) => {
    if (user) {
      if (tag.key) {
        // its an update
        /*const { key, searchableIndex, ...data } = tag
        tag.searchableIndex = createIndex(tag.name)*/
        const {key, ...data} = tag;
        db.collection('tags')
          .doc(key)
          .update(data)
          .then(() => resolve(tag))
          .catch(reject);
      } else {
        // it's a new record
        getTagsForAutocomplete(tag.name, [], 5, 3)
          .then((ta) => {
            // first check that the tag isn't alread in the DB to avoid duplicates
            if (ta[0].name.toLowerCase() === tag.name.toLowerCase()) {
              resolve(ta[0]);
            } else {
              const newCreated: Tag['created'] = {
                by: user.uid,
                on: new Date()
              };
              if (ipAddress !== undefined) {
                newCreated.from = ipAddress;
              }
              const {key, created, path, ...rest} = tag;
              const newPath = tag.name.replace(/([\s]+)/g, '-');
              const newTag = {...rest, created: newCreated, newPath};
              /*const searchableIndex: Tag['searchableIndex'] = createIndex(tag.name)
              const newTag: Tag = {...tag, created, searchableIndex}*/
              db.collection('tags')
                .add(newTag)
                .then(
                  (
                    value: FirebaseFirestore.DocumentReference<
                      FirebaseFirestore.DocumentData
                    >
                  ) => {
                    const data = {...newTag, key: value.id};
                    resolve(data);
                  }
                )
                .catch(reject);
            }
          })
          .catch(reject);
      }
    }
  });
};
