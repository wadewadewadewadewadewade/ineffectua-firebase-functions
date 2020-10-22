import * as admin from 'firebase-admin';
import { firebaseUserDocumentToUser, User, UserUser, UserTag } from "./Types";

export const getUserById = (
  userId: string
): Promise<User> => {
  const db = admin.firestore();
  return new Promise<User>((resolve, reject) => {
    db.collection('users')
      .doc(userId)
      .get()
      .then(
        (
          value: FirebaseFirestore.DocumentSnapshot<
          FirebaseFirestore.DocumentData
          >
        ) => {
          const userData = value.data();
          if (userData === undefined) {
            reject('No user information was returned');
          } else {
            const user: User = firebaseUserDocumentToUser(userId, userData);
            resolve(user);
          }
        }
      )
      .catch(reject);
  });
};

export const addUser = (
  user: UserUser,
  userId: string
): Promise<User> => {
  const db = admin.firestore();
  return new Promise<User>((resolve, reject) => {
    getUserById(userId)
    .then(u => {
      // it's an update
      const { uid, ...newUser} = user;
      db.collection('users')
      .doc(userId)
      .set(newUser, {merge: true})
      .then(() => getUserById(userId).then(resolve).catch(reject))
      .catch(reject);
    })
    .catch(() => {
      // it's an addition
      db.collection('users')
      .add(user)
      .then((value: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) => {
        const uid = value.id;
        getUserById(uid).then(resolve).catch(reject)
      })
      .catch(reject);
    });
  });
};

const convertDocumentDataToUserTag = (
  data: FirebaseFirestore.DocumentData
): UserTag => {
  const doc = data.data();
  return {
    key: data.id,
    tagId: doc.tagId
  };
};

export const getTagsForUser = (
  userId: string
) => {
  const db = admin.firestore();
  return new Promise<Array<UserTag>>((resolve, reject) => {
    if (!userId) {
      resolve(new Array<UserTag>());
    } else {
      db.collection('users')
        .doc(userId)
        .collection('tags')
        .get()
        .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
          const userTags = querySnapshot.docs.map((tagIdDoc) =>
            convertDocumentDataToUserTag(tagIdDoc)
          );
          resolve(userTags);
        })
        .catch(reject);
    }
  });
};

export const addUserTag = (
  user: admin.auth.DecodedIdToken,
  tag: UserTag
) => {
  const db = admin.firestore();
  return new Promise<UserTag>((resolve, reject) => {
    if (user) {
      if (tag.key !== '' && typeof tag.key !== 'undefined') {
        // its an update
        /*const { key, searchableIndex, ...data } = tag
        tag.searchableIndex = createIndex(tag.name)*/
        const {key, ...data} = tag;
        db.collection('users')
          .doc(user.uid)
          .collection('tags')
          .doc(key)
          .update(data)
          .then(() => resolve(tag))
          .catch(reject);
      } else {
        // it's a new record
        const {key, ...rest} = tag;
        const newTag = {...rest};
        db.collection('users')
          .doc(user.uid)
          .collection('tags')
          .add(newTag)
          .then(
            (
              value: FirebaseFirestore.DocumentReference<
                FirebaseFirestore.DocumentData
              >
            ) => {
              const data = {...newTag, key: value.id};
              resolve(data as UserTag);
            }
          )
          .catch(reject);
      }
    }
  });
};

export const deleteUserTag = async (
  userId: string,
  tag: UserTag
) => {
  const db = admin.firestore();
  return new Promise<UserTag>(async (resolve, reject) => {
    try {
      if (tag.key !== '' && typeof tag.key !== 'undefined') {
        db.collection('users')
        .doc(userId)
        .collection('tags')
          .doc(tag.key)
          .delete()
          .then(() => resolve(tag))
          .catch(reject);
      } else {
        reject('Tag ID missing');
      }
    } catch (err) {
      reject(err);
    }
  });
};
