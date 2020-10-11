// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';

admin.initializeApp(functions.config().firebase);

enum PostPrivacyTypes {
  'PUBLIC' = 0,
  'PRIVATE' = 1,
  'FRIENDS' = 2,
}

type PostCriteria = {
  tagId?: string,
  recipientId?: string
  privacy: PostPrivacyTypes
}

type Post = {
  key?: string,
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
  .where('criteria.privacy', '==', PostPrivacyTypes.PUBLIC)
  .offset(postsPageSize * cursor)
  .limit(postsPageSize * (cursor + 1))
  .get()
  .then((querySnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) =>
    querySnapshot.docs.map(p => convertDocumentDataToPost(p))
  )
}

// https://fireship.io/snippets/express-middleware-auth-token-firebase/
const getPosts = (user: admin.auth.DecodedIdToken, cursor: number = 0): Promise<Array<Post>> => {
  const db = admin.firestore();
  return Promise.all<Array<Post>>([
    getPostsByUser(db, user, cursor),
    getPostsByPublic(db, cursor)
  ]).then((postsCollection: Array<Array<Post>>) => {
    const posts = new Array<Post>()
    postsCollection.forEach((ps: Array<Post>) => {
      ps.forEach((p: Post) => {
        posts.push(p)
      })
    })
    return posts.sort((a,b) => a.created.on.getTime() - b.created.on.getTime())
  })
}

const app: express.Express = express()

app.use(require('cors')({origin: true}));

async function getFirebaseUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('Check if request is authorized with Firebase ID token');

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
    console.log('Found \'Authorization\' header');
    idToken = req.headers.authorization.split('Bearer ')[1];
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    return next();
  } catch(error) {
    console.error('Error while verifying Firebase ID token:', error);
    return res.status(403).send('Unauthorized');
  }
}
app.use(getFirebaseUser);
app.get('/posts/:cursor', (req: express.Request<{ cursor: number }>, res: express.Response) => {

  if (req.user) {
    res.json(getPosts(req.user, req.params.cursor));
  }
});

exports.getPosts = functions.https.onRequest(app);