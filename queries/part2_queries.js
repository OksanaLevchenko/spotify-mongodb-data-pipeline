
const spotify = db.getSiblingDB("spotify");

// Task 1: Find tracks suitable for a party
print("\n--- Task 1: Party Tracks ---");

const partyTracks = spotify.tracks.find(
  {
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 }
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    duration_ms: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1
  }
).limit(10).toArray();

printjson(partyTracks);

print("Total matching tracks:");
print(spotify.tracks.countDocuments({
  "audio_features.danceability": { $gt: 0.7 },
  "audio_features.energy": { $gt: 0.7 },
  duration_ms: { $gte: 180000, $lte: 300000 }
}));

// ==========================================
// Task 2 — Popular Artists
// ==========================================

print("\n--- Task 2: Popular Artists ---");

const popularArtists = spotify.tracks.aggregate([
  // Separate each artist from the artists array
  {
    $unwind: "$artists"
  },

  // Group tracks by artist
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },

  // Keep artists with at least 3 tracks
  // and minimum popularity of 60
  {
    $match: {
      track_count: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },

  // Show results with rounded average
  {
    $project: {
      _id: 0,
      artist: "$_id",
      track_count: 1,
      min_popularity: 1,
      avg_popularity: {
        $round: ["$avg_popularity", 1]
      }
    }
  },

  // Sort by highest average popularity
  {
    $sort: {
      avg_popularity: -1,
      track_count: -1,
      artist: 1
    }
  },

  // Show top 20 artists
  {
    $limit: 20
  }
]).toArray();

printjson(popularArtists);


// ==========================================
// Task 3 — Unusual Tempo Tracks
// ==========================================

print("\n--- Task 3: Unusual Tempo Tracks ---");

const unusualTempo = spotify.tracks.aggregate([
  // Calculate tempo statistics for each genre
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      std_tempo: { $stdDevPop: "$audio_features.tempo" },
      tracks: {
        $push: {
          _id: "$_id",
          track_name: "$track_name",
          popularity: "$popularity",
          artists: "$artists",
          audio_features: {
            tempo: "$audio_features.tempo"
          }
        }
      }
    }
  },

  // Calculate the outlier threshold
  {
    $addFields: {
      outlier_threshold: {
        $add: [
          "$avg_tempo",
          { $multiply: [2, "$std_tempo"] }
        ]
      }
    }
  },

  // Keep only tracks faster than the threshold
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 1] },
      outlier_threshold: {
        $round: ["$outlier_threshold", 1]
      },
      outlier_tracks: {
        $filter: {
          input: "$tracks",
          as: "track",
          cond: {
            $gt: [
              "$$track.audio_features.tempo",
              "$outlier_threshold"
            ]
          }
        }
      }
    }
  },

  // Only show genres with unusual tracks
  {
    $match: {
      "outlier_tracks.0": { $exists: true }
    }
  },

  // Sort genres alphabetically
  {
    $sort: { genre: 1 }
  }
], { allowDiskUse: true }).toArray();

print("Genres with unusual tempo tracks: " + unusualTempo.length);

// Show the first 3 genres as examples
printjson(unusualTempo.slice(0, 3));


// ==========================================
// Task 4 — Background Music
// ==========================================

print("\n--- Task 4: Background Music ---");

const backgroundFilter = {
  "audio_features.loudness": { $lt: -10 },
  "audio_features.speechiness": { $lt: 0.1 },
  "audio_features.instrumentalness": { $gt: 0.5 },
  explicit: false
};

// Find tracks that match all conditions
const backgroundTracks = spotify.tracks.find(
  backgroundFilter,
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    explicit: 1,
    "audio_features.loudness": 1,
    "audio_features.speechiness": 1,
    "audio_features.instrumentalness": 1
  }
).limit(10).toArray();

printjson(backgroundTracks);

// Count all matching tracks
const backgroundCount =
  spotify.tracks.countDocuments(backgroundFilter);

print("Total background music tracks: " + backgroundCount);
