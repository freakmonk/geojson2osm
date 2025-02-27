# geojson2osm

A command-line tool to convert GeoJSON files to OSM (OpenStreetMap) XML format, with support for coordinate system (CRS) transformations for BIG geodata files.

It converts a 6GB GeoJSON file into a 12GB OSM file in 120 seconds on a MacBook Air M1.

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
    git clone https://github.com/freakmonk/geojson2osm.git
    cd geojson2osm
    ```

3.  **Install Dependencies:**
    ```bash
    npm init -y
    npm install
    ```

## Usage

```bash
node geojson2osm.js -i input.geojson -o output.osm -s EPSG:3857 -t EPSG:4326

```

## Create binaries for packet processes

```bash
npm install -g pkg

pkg geojson2osm.js -o geojson2osm --target [node18-macos-arm64/node18-macos-x64/node18-linux-arm64/node18-linux-x64/node18-windows-x64]

```
