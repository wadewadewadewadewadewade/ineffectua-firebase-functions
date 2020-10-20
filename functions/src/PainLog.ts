import * as admin from 'firebase-admin';
import {convertDocumentDataToPainLogLocation, PainLogType, PainLogLocation} from "./Types";

export const getPainLog = (
  userId: string
) => {
  const db = admin.firestore();
  return new Promise<PainLogType>((resolve, reject) => {
    db.collection('users')
      .doc(userId)
      .collection('painlog')
      .orderBy('name')
      .get()
      .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
        const painLog: PainLogType = {};
        const arr = querySnapshot.docs.map((d) => {
          const val = convertDocumentDataToPainLogLocation(d);
          return val;
        });
        arr.forEach((d) => {
          if (d.key) {
            painLog[d.key] = d;
          }
        });
        resolve(painLog)
      })
      .catch(reject);
  });
};

export const addPainLog = (
  userId: string,
  painLogLocation: PainLogLocation
): Promise<PainLogLocation> => {
  const db = admin.firestore();
  return new Promise<PainLogLocation>((resolve, reject) => {
    if (painLogLocation.key !== '' && typeof painLogLocation.key !== 'undefined') {
      // its an update
      const {key, ...data} = painLogLocation;
      db.collection('users')
        .doc(userId)
        .collection('painlog')
        .doc(key)
        .update(data)
        .then(() => resolve(painLogLocation))
        .catch(reject);
    } else if (painLogLocation.previous) {
      const prev = painLogLocation.previous;
      // it's a change to a previous location = new record in linked-list
      painLogLocation.created = new Date(Date.now());
      db.collection('users')
        .doc(userId)
        .collection('painlog')
        .add(painLogLocation)
        .then((value: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) => {
          const data = {...painLogLocation, key: value.id};
          // then update the "parent" record witht eh "child" id
          db.collection('users')
            .doc(userId)
            .collection('painlog')
            .doc(prev)
            .update({next: data.key})
            .then(() => resolve(data))
            .catch(reject);
        })
        .catch(reject);
    } else {
      // it's a new record
      painLogLocation.created = new Date(Date.now());
      db.collection('users')
        .doc(userId)
        .collection('painlog')
        .add(painLogLocation)
        .then((value: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) => {
          const data = {...painLogLocation, key: value.id};
          resolve(data);
        })
        .catch(reject);
    }
  });
};
