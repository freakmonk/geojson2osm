# geojson2osm

A command-line tool to convert GeoJSON files to OSM (OpenStreetMap) XML format, with support for coordinate system (CRS) transformations for BIG geodata files.

Its generate 12 Gb osm file from 6 Gb geojson file in 120 seconds on macbook air m1.

## Description

`geojson2osm` is a Node.js-based utility designed to convert GeoJSON data into OSM XML format, suitable for use with OpenStreetMap. It supports various GeoJSON geometry types (Point, LineString, Polygon, MultiPolygon) and handles coordinate system transformations using the `proj4` library. This makes it possible to convert GeoJSON data from various projections (e.g., EPSG:3857, EPSG:25832) to the standard WGS 84 geographic coordinate system (EPSG:4326) used by OpenStreetMap, or to any other target CRS supported by proj4.

The tool is designed to be memory-efficient by processing large GeoJSON files in chunks, which helps manage memory usage when working with very large datasets.

## Features

- **GeoJSON to OSM Conversion:** Converts GeoJSON files to OSM XML.
- **CRS Transformation:** Supports converting coordinates from any CRS supported by `proj4` to any other (default is EPSG:4326).
- **Chunk Processing:** Processes large files in chunks to minimize memory usage.
- **Command-Line Interface:** Easy-to-use command-line interface for specifying input, output, chunk size, source CRS and target CRS.
- **Error Handling:** Robust error handling for invalid GeoJSON format, file I/O issues, and CRS definitions.
- **Support for Various GeoJSON Types**: Handles Point, LineString, Polygon, and MultiPolygon GeoJSON geometry types.
- **Progress indicator**: Show the progress by chunks.

## Installation

1.  **Node.js and npm:** Ensure you have Node.js and npm (Node Package Manager) installed on your system. You can download them from [https://nodejs.org/](https://nodejs.org/).

2.  **Clone the repository (or download the script directly):**

    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual repository URL if available
    cd geojson2osm
    ```

3.  **Install Dependencies:**
    ```bash
    npm install proj4 commander
    ```
    Or if you have yarn:
    ```bash
    yarn add proj4 commander
    ```

## Usage

```bash
node geojson2osm.js -i input.geojson -o output.osm -s EPSG:3857 -t EPSG:4326

```
