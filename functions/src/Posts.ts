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
    .where('criteria.key.id', '==', key)
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
    try {
      if (user) {
        if (post.key !== '' && typeof post.key !== 'undefined') {
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
      } else {
        reject('Unauthorized');
      }
    } catch (err) {
      reject(err);
    }
  });
};

export const deletePost = async (
  user: admin.auth.DecodedIdToken,
  collection: string,
  post: Post
) => {
  const db = admin.firestore();
  return new Promise<void>(async (resolve, reject) => {
    try {
      if (user) {
        // recursively delete any posts associated with this post
        const runawayLimitMax = 1000;
        const getPostsRelatedToKey = async (key: string, col: string): Promise<Array<Post>> =>
          db.collection(col)
          .where('criteria.key.id', '==', post.key)
          .get()
          .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
              querySnapshot.docs.map(p => convertDocumentDataToPost(p))
            );
        const deletePostByKey = (key: string, col: string): Promise<FirebaseFirestore.WriteResult> =>
          db.collection(col)
          .doc(key)
          .delete()
        const deletePostsByCollection = async (key: string, col: string) => {
          const postsToDelete = new Array<string>();
          let children = await getPostsRelatedToKey(key, col);
          let runawayLimit = 0;
          while (children && children.length > 0 && runawayLimit++ < runawayLimitMax) {
            const childrenChildren = children.map(cp => cp.key);
            children = new Array<Post>();
            for (const k of childrenChildren) {
              postsToDelete.push(k);
              const check = await getPostsRelatedToKey(k, col);
              if (check && check.length) {
                check.forEach(cp => children.push(cp))
              }
            }
          }
          postsToDelete.forEach(k => deletePostByKey(k, col))
        }
        if (collection === 'posts') {
          await deletePostsByCollection(post.key, 'comments');
        }
        await deletePostsByCollection(post.key, collection);
        await deletePostByKey(post.key, collection);
        resolve()
      } else {
        reject('Unauthorized');
      }
    } catch (err) {
      reject(err);
    }
  });
};
