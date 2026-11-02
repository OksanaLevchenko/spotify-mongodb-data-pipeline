
import os
import pandas as pd
import certifi

from pymongo import MongoClient
from dotenv import load_dotenv
from tqdm import tqdm

# Load MongoDB connection from .env
load_dotenv()

MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "spotify"
CSV_PATH = "dataset.csv"
BATCH_SIZE = 1000

# Connect to MongoDB Atlas
client = MongoClient(
    MONGO_URI,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=10000
)

db = client[DB_NAME]

# Check connection before modifying data
client.admin.command("ping")
print("Connected to MongoDB Atlas!")

# Read CSV file
df = pd.read_csv(CSV_PATH)
print(f"Found {len(df)} Spotify tracks")

# Remove rows without artists or track names
df = df.dropna(subset=["artists", "track_name"])

# Convert data types
df["explicit"] = df["explicit"].astype(bool)

int_cols = [
    "popularity",
    "duration_ms",
    "key",
    "mode",
    "time_signature"
]

for col in int_cols:
    df[col] = df[col].astype(int)

float_cols = [
    "danceability",
    "energy",
    "loudness",
    "speechiness",
    "acousticness",
    "instrumentalness",
    "liveness",
    "valence",
    "tempo"
]

for col in float_cols:
    df[col] = df[col].astype(float)

# Remove the automatically generated CSV index
df = df.drop(columns=["Unnamed: 0"], errors="ignore")

# Convert rows to MongoDB documents
records = df.to_dict("records")

# Reset collection for repeatable execution
db["tracks_raw"].drop()

# Insert data in batches
for i in tqdm(range(0, len(records), BATCH_SIZE)):
    batch = records[i:i + BATCH_SIZE]
    db["tracks_raw"].insert_many(batch)

# Check results
count = db["tracks_raw"].count_documents({})

print(f"\nSuccessfully uploaded {count} documents!")
print("\nExample document:")
print(db["tracks_raw"].find_one())

client.close()
