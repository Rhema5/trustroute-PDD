# TrustRoute Backend Config

This folder contains backend configuration, security rules, and database schema configurations.

Since the application utilizes a serverless architecture powered by **Firebase (Firestore, Storage, and Authentication)**, the frontend interacts directly with these cloud services via the Firebase client SDK.

## Firestore Security Rules
Below are the recommended firestore security rules to ensure secure data access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper checks
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getUserRole(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role;
    }

    // Users Collection rules
    match /users/{userId} {
      allow read, write: if isSignedIn() && (request.auth.uid == userId || getUserRole(request.auth.uid) == 'owner');
    }

    // Deliveries Collection rules
    match /deliveries/{deliveryId} {
      allow read: if isSignedIn();
      allow create, delete: if isSignedIn() && getUserRole(request.auth.uid) == 'owner';
      allow update: if isSignedIn();
    }
  }
}
```

## Firebase Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
