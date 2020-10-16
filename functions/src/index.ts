// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from "body-parser";
import { getPosts, addPost } from './Posts';

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

const app: express.Express = express();
const main: express.Express = express();
main.use('/v1', app);
main.use(require('cors')({origin: true}));
main.use(getFirebaseUser);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));

export const api = functions.https.onRequest(main);

app.put('/:collection((posts|comments|messages))', (req: express.Request<{ collection: string }>, res: express.Response) => {
  if (!req.user) {
    res.status(401).send('Not authenticated');
  } else {
    const IP = req.headers['x-appengine-user-ip'] as string || req.header('x-forwarded-for') || req.connection.remoteAddress;
    addPost(req.user, req.params.collection, req.body, IP)
    .then(p => res.status(201).send(p.key))
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  }
});

app.get('/:collection((posts|comments|messages))/:key/:cursor', (req: express.Request<{ collection: string, key: string, cursor: string }>, res: express.Response) => {
  if (!req.user) {
    res.status(401).send('Not authenticated');
  } else {
    const {collection, key, cursor} = req.params;
    getPosts(req.user, collection, parseInt(cursor, 10), key)
    .then(p => res.status(200).json(p))
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  }
});

app.get('/:collection((posts|comments|messages))/:cursor', (req: express.Request<{ collection: string, cursor: string }>, res: express.Response) => {
  if (!req.user) {
    res.status(401).send('Not authenticated');
  } else {
    const {collection, cursor} = req.params;
    getPosts(req.user, collection, parseInt(cursor, 10))
    .then(p => res.status(200).json(p))
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  }
});
