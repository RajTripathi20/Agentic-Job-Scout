import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as admin from 'firebase-admin';

// Read config.yaml (placed in src/ but executed from lib/)
export function loadConfig() {
    const configPath = path.join(__dirname, '../src/config.yaml');
    try {
        const file = fs.readFileSync(configPath, 'utf8');
        return yaml.parse(file);
    } catch (e) {
        console.error('Failed to load config.yaml', e);
        return null;
    }
}

// Firestore helper references
export const db = admin.firestore();
export const listingsCollection = db.collection('listings');
