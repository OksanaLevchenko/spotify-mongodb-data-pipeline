
// ==========================================
// Part 3 — Indexes and Optimization
// Task 1 — Query Performance
// ==========================================

const spotify = db.getSiblingDB("spotify");

// Query filter
const filter = {
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
};

// Sort by popularity, highest first
const sort = { popularity: -1 };

// Remove the task index if it already exists.
// This lets us repeat the before/after test.

const indexName = "genre_danceability_popularity_idx";

// Delete the index only if it already exists
const existingIndexes = spotify.tracks.getIndexes();

if (existingIndexes.some(index => index.name === indexName)) {
  spotify.tracks.dropIndex(indexName);
  print("Existing index removed.");
} else {
  print("No existing index found. Starting fresh.");
}


// Function to display important explain results
function showStats(label, result) {
  print("\n--- " + label + " ---");

  print("Execution time (ms): " +
    result.executionStats.executionTimeMillis);

  print("Documents examined: " +
    result.executionStats.totalDocsExamined);

  print("Index keys examined: " +
    result.executionStats.totalKeysExamined);

  print("Documents returned: " +
    result.executionStats.nReturned);

  print("Winning plan:");
  printjson(result.queryPlanner.winningPlan);
}

// Test WITHOUT our index
const before = spotify.tracks
  .find(filter)
  .sort(sort)
  .explain("executionStats");

showStats("BEFORE INDEX", before);

// Create compound index
spotify.tracks.createIndex(
  {
    track_genre: 1,
    "audio_features.danceability": 1,
    popularity: -1
  },
  {
    name: "genre_danceability_popularity_idx"
  }
);

// Test WITH index
const after = spotify.tracks
  .find(filter)
  .sort(sort)
  .explain("executionStats");

showStats("AFTER INDEX", after);


// ==========================================
// Task 2 — Background Music Index
// ==========================================

print("\n--- Task 2: Background Music Index ---");

// Search conditions
const workMusicFilter = {
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 },
  explicit: false
};

// Create compound index
spotify.tracks.createIndex(
  {
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1
  },
  {
    name: "background_music_idx"
  }
);

print("Background music index created!");

// Analyze query execution
const workStats = spotify.tracks
  .find(workMusicFilter)
  .explain("executionStats");

print("\nQuery execution results:");
print("Execution time (ms): " +
  workStats.executionStats.executionTimeMillis);

print("Documents examined: " +
  workStats.executionStats.totalDocsExamined);

print("Index keys examined: " +
  workStats.executionStats.totalKeysExamined);

print("Documents returned: " +
  workStats.executionStats.nReturned);

print("\nWinning plan:");
printjson(workStats.queryPlanner.winningPlan);
