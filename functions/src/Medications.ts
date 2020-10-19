import * as admin from 'firebase-admin';
import {convertDocumentDataToMedication, MedicationsType, Medication} from "./Types";

export const getMedications = (
  userId: string
) => {
  const db = admin.firestore();
  return new Promise<MedicationsType>((resolve, reject) => {
    db.collection('users')
      .doc(userId)
      .collection('medications')
      .orderBy('name')
      .get()
      .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
        const contacts: MedicationsType = {};
        const arr = querySnapshot.docs.map((d) => {
          const val = convertDocumentDataToMedication(d);
          return val;
        });
        arr.forEach((d) => {
          if (d.key) {
            contacts[d.key] = d;
          }
        });
        resolve(contacts)
      })
      .catch(reject);
  });
};

export const addMedication = (
  userId: string,
  medication: Medication
): Promise<Medication> => {
  const db = admin.firestore();
  return new Promise<Medication>((resolve, reject) => {
    if (medication.key) {
      // its an update
      const {key, ...data} = medication;
      db.collection('users')
        .doc(userId)
        .collection('medications')
        .doc(key)
        .update(data)
        .then(() => resolve(medication))
        .catch(reject);
    } else {
      // it's a new record
      db.collection('users')
        .doc(userId)
        .collection('medications')
        .add(medication)
        .then((d) => resolve(convertDocumentDataToMedication(d)))
        .catch(reject);
    }
  });
};