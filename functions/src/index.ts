// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';

admin.initializeApp(functions.config().firebase);

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

type Post = {
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

const convertDocumentDataToPost = (data: FirebaseFirestore.DocumentData): Post => {
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

const postsPageSize = 50

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
const getPosts = (user: admin.auth.DecodedIdToken, cursor: number, key?: string): Promise<Array<Post>> => {
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

const getComments = (user: admin.auth.DecodedIdToken, key: string, cursor: number = 0): Promise<Array<Post>> => {
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

async function getFirebaseUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  //console.log('Check if request is authorized with Firebase ID token');

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    console.error(
      'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      'Make sure you authorize your request by providing the following HTTP header:',
      'Authorization: Bearer <Firebase ID Token>'
      );
    return res.sendStatus(403);
  }

  let idToken = '';
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    //console.log('Found \'Authorization\' header');
    idToken = req.headers.authorization.split('Bearer ')[1];
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    //console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    return next();
  } catch(error) {
    console.error('Error while verifying Firebase ID token:', error);
    return res.status(403).send('Unauthorized');
  }
}

const posts: express.Express = express()
posts.use(require('cors')({origin: true}));
posts.use(getFirebaseUser);
posts.get('/:key/:cursor', (req: express.Request<{ key: string, cursor: string }>, res: express.Response) => {
  const {key, cursor} = req.params
  if (req.user) {
    getPosts(req.user, parseInt(cursor, 10), key).then(p => res.json(p)).catch(err => console.error(err));
  }
});
posts.get('/:cursor', (req: express.Request<{ cursor: string }>, res: express.Response) => {
  if (req.user) {
    getPosts(req.user, parseInt(req.params.cursor, 10)).then(p => res.json(p)).catch(err => console.error(err));
  }
});
exports.posts = functions.https.onRequest(posts);

const comments: express.Express = express()
comments.use(require('cors')({origin: true}));
comments.use(getFirebaseUser);
comments.get('/:key/:cursor', (req: express.Request<{ key: string, cursor: number }>, res: express.Response) => {
  if (req.user) {
    getComments(req.user, req.params.key, req.params.cursor).then(c => res.json(c)).catch(err => console.error(err));
  }
});
exports.comments = functions.https.onRequest(comments);