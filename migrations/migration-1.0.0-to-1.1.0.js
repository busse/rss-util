// Example migration: 1.0.0 → 1.1.0
// This is a template migration that demonstrates the pattern
// In a real scenario, you would implement actual data transformations here

const path = require('path');
const fs = require('fs').promises;

module.exports = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  
  /**
   * Migrate data from version 1.0.0 to 1.1.0
   * This migration is idempotent - safe to run multiple times
   * @param {string} dataDir - Path to the data directory
   */
  async migrate(dataDir) {
    console.log('Running migration 1.0.0 → 1.1.0');
    
    // Example: Add a new field to all feeds
    // In a real migration, you would:
    // 1. Read existing data files
    // 2. Transform the data structure
    // 3. Write the transformed data back
    
    try {
      const feedsPath = path.join(dataDir, 'feeds.json');
      
      // Check if feeds.json exists
      let feeds = [];
      try {
        const feedsData = await fs.readFile(feedsPath, 'utf-8');
        feeds = JSON.parse(feedsData);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, nothing to migrate
          console.log('feeds.json does not exist, skipping feed migration');
          return;
        }
        throw error;
      }
      
      // Example transformation: Add a 'migrated' flag (for demonstration)
      // In a real migration, you would do actual data structure changes
      let hasChanges = false;
      for (const feed of feeds) {
        // Example: Add a field if it doesn't exist
        if (!feed.hasOwnProperty('migratedTo1_1_0')) {
          feed.migratedTo1_1_0 = true;
          hasChanges = true;
        }
      }
      
      // Only write if there were changes
      if (hasChanges) {
        await fs.writeFile(feedsPath, JSON.stringify(feeds, null, 2), 'utf-8');
        console.log('Updated feeds.json with migration changes');
      } else {
        console.log('No changes needed in feeds.json');
      }
      
      // You can add more transformations here for other data files
      // For example: categories.json, read-states.json, etc.
      
    } catch (error) {
      console.error('Error during migration 1.0.0 → 1.1.0:', error);
      throw error;
    }
  }
};

