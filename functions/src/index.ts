// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from "body-parser";
import { getPosts, addPost } from './Posts';
import { getTagsByKeyArray, getTagsForAutocomplete, addTag } from './Tags';
import { addUser, getUserById } from './Users';
import { UserUser } from './Types';

admin.initializeApp(functions.config().firebase);

// https://fireship.io/snippets/express-middleware-auth-token-firebase/
async function getFirebaseUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  //console.log('Check if request is authorized with Firebase ID token');

  /*if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    console.error(
      'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      'Make sure you authorize your request by providing the following HTTP header:',
      'Authorization: Bearer <Firebase ID Token>'
      );
    return res.sendStatus(403);
  }*/

  let idToken = '';
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    //console.log('Found \'Authorization\' header');
    idToken = req.headers.authorization.split('Bearer ')[1];
  }

  if (idToken && idToken.length > 0) {
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      //console.log('ID Token correctly decoded', decodedIdToken);
      req.user = decodedIdToken;
      return next();
    } catch(error) {
      console.error('Error while verifying Firebase ID token:', error);
      return res.status(403).send('Unauthorized');
    }
  } else {
    req.user = undefined;
    return next();
  }
}

const app: express.Express = express();
const main: express.Express = express();
main.use('/v1', app);

export const api = functions.https.onRequest(main);

app.use(require('cors')({origin: true}));
app.use(getFirebaseUser);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.put('/:collection((posts|comments|messages))', (req: express.Request<{ collection: string }>, res: express.Response) => {
  if (!req.user) {
    res.status(403).send('Unauthorized');
  } else {
    const IP = req.headers['x-appengine-user-ip'] as string || req.header('x-forwarded-for') || req.connection.remoteAddress;
    addPost(req.user, req.params.collection, JSON.parse(req.body), IP)
    .then(p => res.status(201).send(p.key))
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  }
});

app.get('/:collection((posts|comments|messages))/:key/:cursor', (req: express.Request<{ collection: string, key: string, cursor: string }>, res: express.Response) => {
  if (!req.user) {
    res.status(403).send('Unauthorized');
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
    res.status(403).send('Unauthorized');
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

app.get('/tags/:prefix/:keysjson', (req: express.Request<{ prefix: string, keysjson: string }>, res: express.Response) => {
  const {prefix, keysjson} = req.params;
  const keys: Array<string> = JSON.parse(keysjson);
  getTagsForAutocomplete(prefix, keys)
  .then(p => res.status(200).json(p))
  .catch(err => {
    console.error(err);
    res.status(500).send(err);
  });
});

app.get('/tags/:keysjson', (req: express.Request<{ keysjson: string }>, res: express.Response) => {
  const {keysjson} = req.params;
  const keys: Array<string> = JSON.parse(keysjson);
  getTagsByKeyArray(keys)
  .then(p => res.status(200).json(p))
  .catch(err => {
    console.error(err);
    res.status(500).send(err);
  });
});

app.put('/tags', (req: express.Request, res: express.Response) => {
  if (!req.user) {
    res.status(403).send('Unauthorized');
  } else {
    const IP = req.headers['x-appengine-user-ip'] as string || req.header('x-forwarded-for') || req.connection.remoteAddress;
    addTag(req.user, JSON.parse(req.body), IP)
    .then(p => res.status(201).send(p.key))
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  }
});

app.put('/users/:userId', (req: express.Request, res: express.Response) => {
  if (!req.user) {
    res.status(403).send('Unauthorized');
  } else {
    const user = JSON.parse(req.body) as UserUser;
    addUser(user, req.user.uid)
    .then(u => res.status(201).send(u))
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  }
});

app.get('/users/:userId', (req: express.Request, res: express.Response) => {
  if (!req.user) {
    res.status(403).send('Unauthorized');
  } else {
    getUserById(req.user.uid)
    .then(u => res.status(201).send(u))
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
  }
});
