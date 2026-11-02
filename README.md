# Spotify NoSQL Homework 1

## Project Overview

This project is my first NoSQL homework. I used MongoDB Atlas, Python, and MongoDB aggregation pipelines to load and analyze Spotify tracks. I also tested how indexes change query execution.

I worked with the **Spotify Tracks Dataset**, which contains 114,000 CSV rows. After removing one row with a missing artist or track name, I imported **113,999 documents**.

## Tools

- Python 3 and PyMongo
- pandas, python-dotenv, tqdm, and certifi
- MongoDB Atlas (Free M0 cluster)
- MongoDB Shell (`mongosh`) through Docker
- VS Code

## Project Structure

```text
nosql-vector-databases/
├── scripts/
│   ├── 01_load_data.py
│   ├── 02_transform.js
│   └── test_connection.py
├── queries/
│   ├── part2_queries.js
│   └── part3_indexes.js
├── requirements.txt
├── README.md
├── .gitignore
├── .env                 # local only; never commit
└── dataset.csv          # download separately
```

The root folder may also contain `docker-compose.yml` and `check_env.py` from the environment setup exercises. They are not required to run the Atlas homework.

## How to Run the Project

### 1. Create a MongoDB Atlas database

Create a **Free M0** cluster in [MongoDB Atlas](https://www.mongodb.com/atlas). Add a database user and allow your current IP address in **Network Access**. Copy the connection string from **Connect → Drivers**.

### 2. Download the dataset

Download the [Spotify Tracks Dataset](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset) and place `dataset.csv` in the project root (next to this README). I used the dataset with **114,000 rows** and fields including `artists`, `track_name`, `popularity`, and `track_genre`.

### 3. Prepare Python

In a terminal opened at the project root, run:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

The project uses `pymongo==4.7.3`, `pandas==3.0.3`, `kaggle==1.6.14`, `python-dotenv==1.0.1`, and `tqdm==4.66.4` from the homework specification. It also uses `certifi` for TLS certificate verification. Make sure these packages are listed in `requirements.txt` with working versions for your Python environment.

### 4. Configure `.env`

Create a `.env` file in the project root with your **own** Atlas credentials:

```dotenv
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/
```

Replace the placeholders locally. If a password contains special URL characters, URL-encode it. **Never commit `.env` or share a live connection string.** Keep `.env`, `.venv/`, and `dataset.csv` in `.gitignore` if they are not meant for submission.

### 5. Load and transform the data

Run the Python loader:

```bash
python scripts/01_load_data.py
```

It creates `spotify.tracks_raw`. The loader uses `certifi` for verified TLS connections on my Mac.

Next, run the JavaScript transformation with MongoDB Shell inside Docker (Docker Desktop must be running):

```bash
docker run --rm \
  --env-file .env \
  -v "$PWD/scripts:/scripts:ro" \
  mongo:8.0 \
  sh -c 'mongosh "$MONGO_URI" --file /scripts/02_transform.js'
```

This creates `spotify.tracks`. The loader and transformation scripts replace their output collections when rerun, so avoid using them on a database containing data you want to keep.

### 6. Run the queries

```bash
docker run --rm \
  --env-file .env \
  -v "$PWD/queries:/queries:ro" \
  mongo:8.0 \
  sh -c 'mongosh "$MONGO_URI" --file /queries/part2_queries.js'
```

For optional indexing experiments:

```bash
docker run --rm \
  --env-file .env \
  -v "$PWD/queries:/queries:ro" \
  mongo:8.0 \
  sh -c 'mongosh "$MONGO_URI" --file /queries/part3_indexes.js'
```

The Part 3 script drops and recreates its Task 1 test index to measure before/after execution. Only run it against your own coursework collection.

---

## Part 1 — Data Loading and Schema Design

### 1.1 Data Loading

I read `dataset.csv` using pandas and connected to MongoDB Atlas with PyMongo. I removed rows missing an artist or track name and converted the numeric and Boolean columns into the correct types. I inserted the records in batches of 1,000 instead of trying to upload everything in one operation.

**Result:** 113,999 documents were uploaded to `spotify.tracks_raw` from 114,000 CSV rows.

### 1.2 Schema Transformation

I used the MongoDB Aggregation Pipeline to create the `spotify.tracks` collection from `spotify.tracks_raw`.

The pipeline:

1. Selects the necessary fields with `$project`.
2. Splits the semicolon-separated `artists` string into an array using `$split`, `$map`, and `$trim`.
3. Groups audio characteristics in an `audio_features` object.
4. Adds `duration_sec` (milliseconds divided by 1,000, rounded to one decimal place).
5. Adds `popularity_tier`: `high` for popularity >= 70, `medium` for 40–69, and `low` for below 40.
6. Removes the old flat audio fields and writes the results to `tracks` using `$out`.

**Result:** 113,999 documents were created in `spotify.tracks`.

### Example Document in `tracks`

This example is based on an actual transformed document. I omitted its automatically generated MongoDB `_id` to keep the example easy to read.

```json
{
  "track_id": "5SuOikwiRyPMVoIQDJUgSV",
  "track_name": "Comedy",
  "album_name": "Comedy",
  "artists": ["Gen Hoshino"],
  "popularity": 73,
  "popularity_tier": "high",
  "duration_ms": 230666,
  "duration_sec": 230.7,
  "explicit": false,
  "track_genre": "acoustic",
  "audio_features": {
    "danceability": 0.676,
    "energy": 0.461,
    "loudness": -6.746,
    "speechiness": 0.143,
    "acousticness": 0.0322,
    "instrumentalness": 0.00000101,
    "liveness": 0.358,
    "valence": 0.715,
    "tempo": 87.917,
    "key": 1,
    "mode": 0,
    "time_signature": 4
  }
}
```

### Question 1 — Why store audio features in a nested object?

I put audio fields such as `danceability`, `energy`, `tempo`, and `loudness` in the `audio_features` object because they describe the same part of a track. This makes the document easier to understand and keeps related data together.

This is useful when an application often reads the audio features together. It can become less convenient when queries or updates regularly need only individual nested fields, since I must use paths such as `audio_features.energy`. Indexes also need the correct nested field paths. For this dataset, I think the clearer structure is worth it.

### Question 2 — Why store artists in an array instead of a string?

A track can have more than one artist. In the raw CSV, artist names are joined by semicolons. I changed a value like `"Drake;Future"` into `["Drake", "Future"]`.

This makes searching for one artist easier:

```javascript
db.tracks.find({ artists: "Drake" });
```

MongoDB can match an element inside the array without string parsing. I can also use `$unwind` to analyze each artist separately, which I did in Part 2 Task 2.

---

## Part 2 — MongoDB Queries

All four tasks are in `queries/part2_queries.js`.

### Task 1 — Party Tracks

I used `find()` to search for tracks with `audio_features.danceability > 0.7`, `audio_features.energy > 0.7`, and `duration_ms` between 180,000 and 300,000 (3–5 minutes, including the endpoints).

**Result: 7,311 matching tracks.**

For example, **“Kaleidoscope” by A Great Big World** has danceability **0.709**, energy **0.913**, and duration **229,320 ms**, so it matches.

I used `$gt`, `$gte`, and `$lte` for the conditions. I used projection to show only useful fields and `.limit(10)` for a short sample, while `countDocuments()` gave the full match count.

### Task 2 — Artists Whose Tracks Are All Popular

I used `$unwind` to separate artists from the arrays, then `$group` to find each artist's track count, minimum popularity, and average popularity. I used `$match` to keep artists with **at least 3 tracks** and **minimum popularity of at least 60**, and `$round` to display average popularity to one decimal place. Finally, I sorted by average popularity and limited the output to 20 artists.

For example, **Ricky Montgomery** had **4 tracks**, a minimum popularity of **79**, and average popularity of **80.5**. Another returned artist, **Beach Bunny**, had **7 tracks**, minimum popularity **73**, and average popularity **79.4**.

Calculating the minimum before filtering is important: an artist should not qualify if even one of their tracks has a score below 60.

### Task 3 — Unusual Tempo Tracks

I grouped tracks by `track_genre` and calculated the average tempo with `$avg` and population standard deviation with `$stdDevPop`.

For each genre, the outlier threshold is:

**Outlier threshold = average tempo + 2 × population standard deviation**

I then used `$filter` to return tracks whose tempo is strictly above that threshold. Each result contains `genre`, `avg_tempo`, `outlier_threshold`, and an `outlier_tracks` array with track details.

The returned examples included **“Laberintos” by División Minúscula** at **215.513 BPM** and **“Primavera” by Los Hermanos** at **200.332 BPM**. A fast tempo alone does not make a track an outlier: it must be higher than the threshold for its *own genre*.

The script displays only the first three matching genres to keep the terminal output short; the aggregation calculates results for all genres.

### Task 4 — Background Music

I used `find()` to search for music suitable for background listening while working. Each track must meet all four conditions:

- `audio_features.loudness < -10`
- `audio_features.speechiness < 0.1`
- `audio_features.instrumentalness > 0.5`
- `explicit: false`

**Result: 9,324 matching tracks.**

For example, **“Game of Thrones” by Edy Hafler** has loudness **-12.98**, speechiness **0.05**, instrumentalness **0.903**, and `explicit: false`.

I used `$lt` and `$gt` for the audio fields and a Boolean condition for explicit content. The conditions are combined with AND.

---

## Part 3 — Indexes and Query Optimization (Optional)

The code is in `queries/part3_indexes.js`. The measurements below come from my MongoDB Atlas tests; execution times can change between runs.

### Task 1 — Before and After an Index

I analyzed a query for `track_genre: "pop"` and `audio_features.danceability >= 0.7`, sorted by `popularity` descending.

I compared `explain("executionStats")` without my compound index and after creating this index:

```javascript
{
  track_genre: 1,
  "audio_features.danceability": 1,
  popularity: -1
}
```

| Metric | Before Index | After Index |
| --- | ---: | ---: |
| Execution time | 72 ms | 2 ms |
| Documents examined | 113,999 | 354 |
| Index keys examined | 0 | 354 |
| Documents returned | 354 | 354 |
| Execution plan | `COLLSCAN` + `SORT` | `IXSCAN` + `SORT` |

Before creating the index, MongoDB scanned all **113,999** documents. After creating the index, it examined **354 documents** and **354 index keys**, and returned the same **354 results**.

The time changed from 72 ms to 2 ms, about **36 times faster in this test**. The important evidence that the index was used is `IXSCAN`, instead of `COLLSCAN`, in the winning plan and `totalKeysExamined: 354`.

A separate `SORT` stage was still present after indexing. The index helped find matching documents, but it did not remove the need for sorting in this query.

### Task 2 — Background Music Index

I created a compound index named `background_music_idx`:

```javascript
{
  explicit: 1,
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1
}
```

I placed `explicit` first because the query checks an exact Boolean value; the other fields use range comparisons.

The winning plan contained **`IXSCAN`** with `indexName: "background_music_idx"`, confirming that MongoDB used this index. It also contained a **`FETCH`** stage, meaning matching full documents were retrieved from the collection.

The reported index bounds were `explicit: false`, `instrumentalness > 0.5`, and `speechiness < 0.1`. I did not record a before/after time comparison for this task, so I am not claiming a measured speedup here.

### Task 3 — Is the Given Query Covered?

The homework asks whether this query is covered by the Task 1 index:

```javascript
db.tracks.find({
  track_genre: "pop",
  popularity: { $gte: 70 }
});
```

**No, this is not a covered query.** A covered query can return its result using only index entries without fetching full documents. The Task 1 index contains `track_genre`, `audio_features.danceability`, and `popularity`, but the query does not specify a projection. It therefore requests complete documents, including fields not available in that index and `_id`.

To make a query covered, both the filter and returned fields must be available from a suitable index. An appropriate projection would be required, including `_id: 0` when `_id` is not in the index. Also, `IXSCAN` alone does not prove a query is covered; the execution plan should not need a document `FETCH`, and `totalDocsExamined` should be 0.

---

## Conclusion

In this homework, I loaded **113,999 Spotify tracks** into MongoDB Atlas and transformed flat CSV data into nested MongoDB documents. I practiced filtering, working with arrays, and using aggregation pipelines for grouping and basic statistics. I also learned how to check query execution plans and verify index usage instead of assuming an index always makes a query faster.
