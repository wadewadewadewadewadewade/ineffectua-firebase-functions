import * as admin from 'firebase-admin';
import { convertDocumentDataToPost, PostPrivacyTypes, Post } from './Types';

export const postsPageSize = 50

const getPostsByUser = (
  db: FirebaseFirestore.Firestore,
  user: admin.auth.DecodedIdToken,
  collection: string,
  cursor: number = 0
) => {
  return db.collection(collection)
  .where('created.by', '==', user.uid)
  .offset(postsPageSize * cursor)
  .limit(postsPageSize * (cursor + 1))
  .get()
  .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
    querySnapshot.docs.map(p => convertDocumentDataToPost(p))
  )
}

const getPostsByPublic = (db: FirebaseFirestore.Firestore, collection: string, cursor: number = 0) => {
  return db.collection(collection)
  .where('criteria.privacy', 'in', [PostPrivacyTypes.PUBLIC])
  .offset(postsPageSize * cursor)
  .limit(postsPageSize * (cursor + 1))
  .get()
  .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
    querySnapshot.docs.map(p => convertDocumentDataToPost(p))
  )
}

export const getPosts = (
  user: admin.auth.DecodedIdToken,
  collection: string,
  cursor: number = 0,
  key?: string
): Promise<Array<Post>> => {
  const db = admin.firestore();
  if (typeof key !== 'undefined') {
    return db.collection(collection)
    .where(admin.firestore.FieldPath.documentId(), '==', key)
    .offset(postsPageSize * cursor)
    .limit(postsPageSize * (cursor + 1))
    .get()
    .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
      querySnapshot.docs.map(p => convertDocumentDataToPost(p))
    )
  } else {
    return Promise.all<Array<Post>>([
      getPostsByUser(db, user, collection, cursor),
      getPostsByPublic(db, collection, cursor)
    ]).then((postsCollection: Array<Array<Post>>) => {
      const postArray = new Array<Post>()
      const keysAdded: { [key: string]: boolean } = {}
      postsCollection.forEach((ps: Array<Post>) => {
        ps.forEach((p: Post) => {
          if (p.key && !keysAdded[p.key]) {
            keysAdded[p.key] = true // remove duplicates
            postArray.push(p)
          }
        })
      })
      return postArray.sort((a,b) => b.created.on.getTime() - a.created.on.getTime())
    })
  }
}

export const addPost = (
  user: admin.auth.DecodedIdToken,
  collection: string,
  post: Post,
  ipAddress?: string
) => {
  const db = admin.firestore();
  return new Promise<Post>((resolve, reject) => {
    if (user) {
      if (post.key !== '') {
        // its an update
        const {key, ...data} = post;
        db.collection(collection)
          .doc(key)
          .update(data)
          .then(() => resolve(post))
          .catch(reject);
      } else {
        // it's a new record
        const newCreated: Post['created'] = {
          by: user.uid,
          on: new Date()
        };
        if (ipAddress !== undefined) {
          newCreated.from = ipAddress;
        }
        const {key, created, ...rest} = post;
        const newPost = {...rest, created: newCreated};
        console.log('adding ' + collection, JSON.stringify(newPost))
        db.collection(collection)
          .add(newPost)
          .then(
            (
              value: FirebaseFirestore.DocumentReference<
                FirebaseFirestore.DocumentData
              >
            ) => {
              const data: Post = {...newPost, key: value.id};
              console.log('new post', JSON.stringify(data))
              resolve(data);
            }
          ).catch(e => reject(e))
      }
    }
  });
};
