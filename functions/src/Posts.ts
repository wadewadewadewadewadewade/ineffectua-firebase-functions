
import * as admin from 'firebase-admin';
import { convertDocumentDataToPost, PostPrivacyTypes, Post } from './Types';

export const postsPageSize = 50

const getPostsByUser = (db: FirebaseFirestore.Firestore, user: admin.auth.DecodedIdToken, cursor: number = 0) => {
  return db.collection('posts')
  .where('created.by', '==', user.uid)
  .offset(postsPageSize * cursor)
  .limit(postsPageSize * (cursor + 1))
  .get()
  .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
    querySnapshot.docs.map(p => convertDocumentDataToPost(p))
  )
}

const getPostsByPublic = (db: FirebaseFirestore.Firestore, cursor: number = 0) => {
  return db.collection('posts')
  .where('criteria.privacy', 'in', [PostPrivacyTypes.PUBLIC, PostPrivacyTypes.PUBLICANDFRIENDS])
  .offset(postsPageSize * cursor)
  .limit(postsPageSize * (cursor + 1))
  .get()
  .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
    querySnapshot.docs.map(p => convertDocumentDataToPost(p))
  )
}

// https://fireship.io/snippets/express-middleware-auth-token-firebase/
export const getPosts = (user: admin.auth.DecodedIdToken, cursor: number, key?: string): Promise<Array<Post>> => {
  const db = admin.firestore();
  if (typeof key !== 'undefined') {
    return db.collection('posts')
    .where(admin.firestore.FieldPath.documentId(), '==', key)
    .offset(postsPageSize * cursor)
    .limit(postsPageSize * (cursor + 1))
    .get()
    .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
      querySnapshot.docs.map(p => convertDocumentDataToPost(p))
    )
  } else {
    return Promise.all<Array<Post>>([
      getPostsByUser(db, user, cursor),
      getPostsByPublic(db, cursor)
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
  post: Post,
  ipAddress?: string
) => {
  const collectionName = post.criteria.key ? post.criteria.key.type : 'posts';
  const db = admin.firestore();
  return new Promise<Post>((resolve, reject) => {
    if (user) {
      if (post.key !== '') {
        // its an update
        const {key, ...data} = post;
        db.collection(collectionName)
          .doc(key)
          .update(data)
          .then(() => resolve(post))
          .catch(reject);
      } else {
        // it's a new record
        const newCreated: Post['created'] = {
          by: user.uid,
          on: new Date(),
        };
        if (ipAddress !== undefined) {
          newCreated.from = ipAddress;
        }
        const {key, created, ...rest} = post;
        const newPost = {...rest, created: newCreated};
        db.collection(collectionName)
          .add(newPost)
          .then(
            (
              value: FirebaseFirestore.DocumentReference<
                FirebaseFirestore.DocumentData
              >
            ) => {
              const data: Post = {...newPost, key: value.id};
              resolve(data);
            }
          ).catch(e => reject(e))
      }
    }
  });
};