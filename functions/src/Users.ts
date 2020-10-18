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
    name: doc.name,
    tagId: doc.tagId
  };
};

export const getTagIdsForUser = (
  userId: string
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
