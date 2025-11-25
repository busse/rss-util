// Migration runner and registry
// This module manages data migrations between app versions

const path = require('path');
const fs = require('fs').promises;

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

/**
 * Get all available migrations
 */
async function getAvailableMigrations() {
  const migrationsDir = __dirname;
  const files = await fs.readdir(migrationsDir);
  
  const migrations = [];
  for (const file of files) {
    if (file.startsWith('migration-') && file.endsWith('.js') && file !== 'index.js') {
      try {
        const migration = require(path.join(migrationsDir, file));
        if (migration.fromVersion && migration.toVersion && migration.migrate) {
          migrations.push({
            fromVersion: migration.fromVersion,
            toVersion: migration.toVersion,
            migrate: migration.migrate,
            name: file
          });
        }
      } catch (error) {
        console.error(`Error loading migration ${file}:`, error);
      }
    }
  }
  
  // Sort migrations by version
  migrations.sort((a, b) => compareVersions(a.fromVersion, b.fromVersion));
  
  return migrations;
}

/**
 * Run migrations from stored version to current version
 * @param {string} dataDir - Path to data directory
 * @param {string} currentVersion - Current app version
 * @param {string} storedVersion - Version stored in user data
 * @returns {Promise<boolean>} - Success status
 */
async function runMigrations(dataDir, currentVersion, storedVersion) {
  try {
    // If versions match, no migration needed
    if (compareVersions(storedVersion, currentVersion) === 0) {
      console.log('Data is already at current version, no migration needed');
      return true;
    }
    
    // If stored version is newer, that's unexpected but we'll skip migration
    if (compareVersions(storedVersion, currentVersion) > 0) {
      console.warn(`Stored version (${storedVersion}) is newer than app version (${currentVersion}), skipping migration`);
      return true;
    }
    
    console.log(`Running migrations from ${storedVersion} to ${currentVersion}`);
    
    const availableMigrations = await getAvailableMigrations();
    
    // Find migrations that need to run
    const migrationsToRun = availableMigrations.filter(m => {
      // Migration should run if:
      // 1. storedVersion >= fromVersion (we're at or past the source version)
      // 2. storedVersion < toVersion (we haven't reached the target version yet)
      // 3. toVersion <= currentVersion (migration target is within our upgrade path)
      const storedFromCompare = compareVersions(storedVersion, m.fromVersion);
      const storedToCompare = compareVersions(storedVersion, m.toVersion);
      const toCurrentCompare = compareVersions(m.toVersion, currentVersion);
      
      return storedFromCompare >= 0 && storedToCompare < 0 && toCurrentCompare <= 0;
    });
    
    if (migrationsToRun.length === 0) {
      console.log('No migrations found for this version range');
      // Only update stored version if we're already at or past current version
      // Otherwise, we might be missing migrations and shouldn't update
      const storedCurrentCompare = compareVersions(storedVersion, currentVersion);
      if (storedCurrentCompare >= 0) {
        // Stored version is at or newer than current, safe to update
        await updateStoredVersion(dataDir, currentVersion);
      } else {
        // Stored version is older but no migrations found - this might indicate missing migrations
        console.warn(`No migrations found to upgrade from ${storedVersion} to ${currentVersion}. Data version not updated.`);
      }
      return true;
    }
    
    // Run migrations sequentially
    for (const migration of migrationsToRun) {
      console.log(`Running migration: ${migration.name} (${migration.fromVersion} → ${migration.toVersion})`);
      
      try {
        await migration.migrate(dataDir);
        console.log(`Migration ${migration.name} completed successfully`);
      } catch (error) {
        console.error(`Migration ${migration.name} failed:`, error);
        throw new Error(`Migration ${migration.name} failed: ${error.message}`);
      }
    }
    
    // Update stored version after successful migration
    await updateStoredVersion(dataDir, currentVersion);
    console.log('All migrations completed successfully');
    
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

/**
 * Get stored version from settings.json
 */
async function getStoredVersion(dataDir) {
  try {
    const settingsPath = path.join(dataDir, 'settings.json');
    const settingsData = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsData);
    return settings.appVersion || '1.0.0'; // Default to 1.0.0 if not set
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Settings file doesn't exist, assume first run
      return '1.0.0';
    }
    throw error;
  }
}

/**
 * Update stored version in settings.json
 */
async function updateStoredVersion(dataDir, version) {
  try {
    const settingsPath = path.join(dataDir, 'settings.json');
    let settings = {};
    
    try {
      const settingsData = await fs.readFile(settingsPath, 'utf-8');
      settings = JSON.parse(settingsData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, create new settings
    }
    
    settings.appVersion = version;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error updating stored version:', error);
    throw error;
  }
}

module.exports = {
  runMigrations,
  getStoredVersion,
  updateStoredVersion,
  compareVersions
};

