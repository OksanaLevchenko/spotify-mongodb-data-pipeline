# Spotify Analytics Pipeline with MongoDB

This project explores how I would load, reshape, query, and index a larger semi structured dataset in MongoDB.

I used a Spotify tracks dataset with 114,000 CSV rows. After removing one record with a missing artist or track name, the pipeline loaded 113,999 documents into MongoDB Atlas.

## What I built

The project uses Python and MongoDB to:

* load CSV data into MongoDB Atlas
* clean and normalize values before insert
* transform the raw collection with aggregation pipelines
* move related audio fields into a nested object
* convert artists from a delimited string into an array
* add derived fields such as duration in seconds and popularity tiers
* run analytical queries against the transformed data
* compare query behavior before and after indexing

## Stack

* Python
* PyMongo
* pandas
* MongoDB Atlas
* MongoDB aggregation pipelines
* mongosh
* Docker

## Project structure

```text
.
├── scripts/
│   ├── 01_load_data.py
│   ├── 02_transform.js
│   └── test_connection.py
├── queries/
│   ├── part2_queries.js
│   └── part3_indexes.js
├── requirements.txt
└── README.md
```

## Data flow

The loader reads the CSV with pandas, validates the important fields, converts values into the correct types, and inserts the records in batches.

The transformation pipeline then creates a cleaner `tracks` collection from the raw data. Related audio fields are grouped into an `audio_features` object, artist names are stored as an array, and several derived values are added for easier analysis.

## Example transformation

A raw artist value such as:

```text
Drake;Future
```

becomes:

```json
["Drake", "Future"]
```

That makes artist based queries and aggregation much easier than parsing a single string every time.

## Indexing experiment

The project also includes an indexing exercise where I compare query execution before and after adding an index. The goal is to see how schema and index choices affect query behavior, not just whether a query returns the right result.

## Running the project

Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Create a local `.env` file with your own MongoDB Atlas connection string. Do not commit credentials.

Load the data:

```bash
python scripts/01_load_data.py
```

Run the transformation with mongosh through Docker:

```bash
docker run --rm \
  --env-file .env \
  -v "$PWD/scripts:/scripts:ro" \
  mongo:8.0 \
  sh -c 'mongosh "$MONGO_URI" --file /scripts/02_transform.js'
```

Run the query set:

```bash
docker run --rm \
  --env-file .env \
  -v "$PWD/queries:/queries:ro" \
  mongo:8.0 \
  sh -c 'mongosh "$MONGO_URI" --file /queries/part2_queries.js'
```

## What this demonstrates

The project shows practical work with data loading, MongoDB document modeling, aggregation pipelines, Python integration, and basic query performance analysis.
