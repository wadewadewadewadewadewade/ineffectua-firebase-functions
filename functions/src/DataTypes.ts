import * as admin from 'firebase-admin';
import {convertDocumentDataToDataType, DataTypesType, DataType} from "./Types";

export const getDataTypes = (
  userId: string
) => {
  const db = admin.firestore();
  return new Promise<DataTypesType>((resolve, reject) => {
    db.collection('users')
      .doc(userId)
      .collection('datatypes')
      .get()
      .then((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
        const datatypes: DataTypesType = {};
        const arr = querySnapshot.docs.map((d) => {
          const val = convertDocumentDataToDataType(d);
          return val;
        });
        arr.forEach((d) => {
          if (d.key) {
            datatypes[d.key] = d;
          }
        });
        resolve(datatypes)
      })
      .catch(reject);
  });
};

export const addDataType = (
  userId: string,
  datatype: DataType
): Promise<DataType> => {
  const db = admin.firestore();
  return new Promise<DataType>((resolve, reject) => {
    if (datatype.key) {
      // its an update
      const {key, ...data} = datatype;
      db.collection('users')
        .doc(userId)
        .collection('datatypes')
        .doc(key)
        .update(data)
        .then(() => resolve(datatype))
        .catch(reject);
    } else {
      // it's a new record
      db.collection('users')
        .doc(userId)
        .collection('datatypes')
        .add(datatype)
        .then((d) => resolve(convertDocumentDataToDataType(d)))
        .catch(reject);
    }
  });
};
