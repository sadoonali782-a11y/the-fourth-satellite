"""Turns Natural Earth's 1:50m land outlines (GeoJSON) into the small coastline file the site loads.

Run once, by hand:  python make_coastlines.py ne_50m_land.geojson ../site/data/coastlines.json

Output: {"source": ..., "unitInDegrees": 0.01, "rings": [[...], ...]}
Each ring is one closed coastline, written as whole numbers in hundredths of a degree.
To keep the file small, only the first point is written in full; every later pair of numbers is
the step (change in longitude, change in latitude) from the point before it.
Points that land on the same spot after rounding are removed.
"""

import json
import sys


def to_hundredths(degrees):
    return int(round(degrees * 100))


def encode_ring(points):
    numbers = []
    previous_longitude = None
    previous_latitude = None
    for longitude_in_degrees, latitude_in_degrees in points:
        longitude = to_hundredths(longitude_in_degrees)
        latitude = to_hundredths(latitude_in_degrees)
        if previous_longitude is None:
            numbers.extend([longitude, latitude])
        elif (longitude, latitude) != (previous_longitude, previous_latitude):
            numbers.extend([longitude - previous_longitude, latitude - previous_latitude])
        else:
            continue
        previous_longitude, previous_latitude = longitude, latitude
    return numbers


def main():
    input_path, output_path = sys.argv[1], sys.argv[2]
    with open(input_path, encoding="utf-8") as input_file:
        land = json.load(input_file)

    rings = []
    for feature in land["features"]:
        geometry = feature["geometry"]
        if geometry["type"] == "Polygon":
            polygons = [geometry["coordinates"]]
        else:
            polygons = geometry["coordinates"]
        for polygon in polygons:
            for ring in polygon:
                numbers = encode_ring(ring)
                if len(numbers) >= 8:  # at least 4 points, or it is too small to see
                    rings.append(numbers)

    output = {
        "source": "Natural Earth 1:50m land, public domain (naturalearthdata.com)",
        "unitInDegrees": 0.01,
        "rings": rings,
    }
    with open(output_path, "w", encoding="utf-8") as output_file:
        json.dump(output, output_file, separators=(",", ":"))
    print(len(rings), "rings,", sum(len(r) for r in rings) // 2, "points")


main()
