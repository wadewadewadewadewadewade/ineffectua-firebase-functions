// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import { getPosts } from './Posts';
import { getComments } from './Comments';

admin.initializeApp(functions.config().firebase);

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
comments.get('/:key/:cursor', (req: express.Request<{ key: string, cursor: string }>, res: express.Response) => {
  if (req.user) {
    getComments(req.user, req.params.key, parseInt(req.params.cursor, 10)).then(c => res.json(c)).catch(err => console.error(err));
  }
});
exports.comments = functions.https.onRequest(comments);