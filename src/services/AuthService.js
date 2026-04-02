import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

class AuthService {
  /**
   * Beobachtet den Auth-Status. Callback erhält user-Objekt oder null.
   * Gibt eine Unsubscribe-Funktion zurück.
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  getCurrentUser() {
    return auth.currentUser;
  }

  async register(email, password, displayName) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await updateProfile(user, { displayName });

    // Nutzerprofil in Firestore anlegen
    await setDoc(doc(db, 'users', user.uid), {
      displayName,
      email,
      createdAt: serverTimestamp(),
    });

    return user;
  }

  async login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async logout() {
    await signOut(auth);
  }
}

export default new AuthService();
