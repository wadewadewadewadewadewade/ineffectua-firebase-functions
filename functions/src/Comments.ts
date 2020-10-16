import * as admin from 'firebase-admin';
import { convertDocumentDataToPost, PostPrivacyTypes, Post } from './Types';
import { postsPageSize } from './Posts';


const getCommentsByUser = (db: FirebaseFirestore.Firestore, user: admin.auth.DecodedIdToken, key: string, cursor: number = 0) => {
  return db.collection('comments')
  .where('criteria.key.id', '==', key)
  .where('created.by', '==', user.uid)
  .offset(postsPageSize * cursor)
  .limit(postsPageSize * (cursor + 1))
  .get()
  .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
    querySnapshot.docs.map(p => convertDocumentDataToPost(p))
  )
}

const getCommentsByPublic = (db: FirebaseFirestore.Firestore, key: string, cursor: number = 0) => {
  return db.collection('comments')
  .where('criteria.key.id', '==', key)
  .where('criteria.privacy', '==', PostPrivacyTypes.PUBLIC)
  .offset(postsPageSize * cursor)
  .limit(postsPageSize * (cursor + 1))
  .get()
  .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
    querySnapshot.docs.map(p => convertDocumentDataToPost(p))
  )
}

export const getComments = (user: admin.auth.DecodedIdToken, key: string, cursor: number = 0): Promise<Array<Post>> => {
  const db = admin.firestore();
  return Promise.all<Array<Post>>([
    getCommentsByUser(db, user, key, cursor),
    getCommentsByPublic(db, key, cursor)
  ]).then((postsCollection: Array<Array<Post>>) => {
    const commentsArray = new Array<Post>()
    const keysAdded: { [key: string]: boolean } = {}
    postsCollection.forEach((cs: Array<Post>) => {
      cs.forEach((p: Post) => {
        if (p.key && !keysAdded[p.key]) {
          keysAdded[p.key] = true // remove duplicates
          commentsArray.push(p)
        }
      })
    })
    return commentsArray.sort((a,b) => b.created.on.getTime() - a.created.on.getTime())
  })
}
