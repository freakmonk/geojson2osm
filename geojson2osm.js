const fs = require("fs");
const { performance } = require("perf_hooks");
const { program } = require("commander");
const readline = require("readline");
const proj4 = require("proj4"); // Import proj4
var isLastLine;

// Default Configuration (can be overridden by command-line arguments)
const DEFAULT_GEOJSON_FILE_PATH = "input.geojson";
const DEFAULT_OSM_FILE_PATH = "output.osm";
const DEFAULT_MAX_FEATURES_PER_CHUNK = 10000;
const DEFAULT_INPUT_CRS = "EPSG:4326"; // Default CRS is now EPSG:4326
const DEFAULT_TARGET_CRS = "EPSG:4326"; // Target CRS remains EPSG:4326

// Command-line argument parsing
program
  .name("geojson2osm")
  .description("Convert GeoJSON to OSM XML")
  .version("1.0.0")
  .option(
    "-i, --input <file>",
    "Input GeoJSON file path",
    DEFAULT_GEOJSON_FILE_PATH
  )
  .option("-o, --output <file>", "Output OSM file path", DEFAULT_OSM_FILE_PATH)
  .option(
    "-c, --chunk-size <number>",
    "Maximum features per chunk",
    parseInt,
    DEFAULT_MAX_FEATURES_PER_CHUNK
  )
  .option(
    "-s, --source-crs <string>",
    "Source CRS (e.g., EPSG:3857)",
    DEFAULT_INPUT_CRS
  )
  .option(
    "-t, --target-crs <string>",
    "Target CRS (e.g., EPSG:4326)",
    DEFAULT_TARGET_CRS
  )
  .parse(process.argv);

const options = program.opts();

// Configuration using command-line arguments or defaults
const GEOJSON_FILE_PATH = options.input;
const OSM_FILE_PATH = options.output;
const MAX_FEATURES_PER_CHUNK = options.chunkSize;
const SOURCE_CRS = options.sourceCrs; // Get the source CRS from command line.
const TARGET_CRS = options.targetCrs; // Get the target CRS from command line.

// Helper function to estimate GeoJSON file size in MB
function getFileSizeMB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
  } catch (error) {
    // Improved error handling: Check for ENOENT and handle it specifically
    if (error.code === "ENOENT") {
      console.error(`Error: Input file not found at path: ${filePath}`);
      return -1; // Indicate file not found
    } else {
      console.error("Error getting file size:", error);
      return 0;
    }
  }
}

// Helper function to escape XML characters
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
    }
    return c;
  });
}

// Function to convert coordinates using proj4
function convertCoordinates(coordinates, sourceCRS, targetCRS) {
  if (sourceCRS === targetCRS) {
    return coordinates; // No conversion needed if source and target are the same
  }
  //console.log("sourceCRS", sourceCRS, "targetCRS", targetCRS)
  // Check if sourceCRS or targetCRS is undefined or null
  if (!sourceCRS || !targetCRS) {
    throw new Error("Source or target CRS is undefined or null");
  }
  const sourceProj = proj4.defs(sourceCRS);
  const targetProj = proj4.defs(targetCRS);

  if (!sourceProj || !targetProj) {
    throw new Error(
      "Invalid source or target CRS. Check if EPSG code is supported"
    );
  }

  return proj4(sourceProj, targetProj, coordinates);
}

// Function to convert GeoJSON feature to OSM XML element
function geojsonFeatureToOsm(feature, osmIdCounter, sourceCRS, targetCRS) {
  const osmElements = [];
  const tags = [];

  // Add tags
  if (feature.properties) {
    for (const key in feature.properties) {
      if (Object.hasOwnProperty.call(feature.properties, key)) {
        tags.push(
          `<tag k="${escapeXml(key)}" v="${escapeXml(
            String(feature.properties[key])
          )}"/>`
        );
      }
    }
  }

  if (feature.geometry.type === "Point") {
    const convertedCoordinates = convertCoordinates(
      feature.geometry.coordinates,
      sourceCRS,
      targetCRS
    );
    osmElements.push(
      `<node id="${osmIdCounter.node}" lat="${convertedCoordinates[1]}" lon="${
        convertedCoordinates[0]
      }">${tags.join("")}</node>`
    );
    osmIdCounter.node--;
  } else if (feature.geometry.type === "LineString") {
    const wayNodes = [];
    for (const coord of feature.geometry.coordinates) {
      const convertedCoordinates = convertCoordinates(
        coord,
        sourceCRS,
        targetCRS
      );
      osmElements.push(
        `<node id="${osmIdCounter.node}" lat="${convertedCoordinates[1]}" lon="${convertedCoordinates[0]}"/>`
      );
      wayNodes.push(`<nd ref="${osmIdCounter.node}"/>`);
      osmIdCounter.node--;
    }
    osmElements.push(
      `<way id="${osmIdCounter.way}">${wayNodes.join("")}${tags.join("")}</way>`
    );
    osmIdCounter.way--;
  } else if (feature.geometry.type === "Polygon") {
    const wayNodes = [];
    for (const coord of feature.geometry.coordinates[0]) {
      const convertedCoordinates = convertCoordinates(
        coord,
        sourceCRS,
        targetCRS
      );
      osmElements.push(
        `<node id="${osmIdCounter.node}" lat="${convertedCoordinates[1]}" lon="${convertedCoordinates[0]}"/>`
      );
      wayNodes.push(`<nd ref="${osmIdCounter.node}"/>`);
      osmIdCounter.node--;
    }
    wayNodes.push(`<nd ref="${wayNodes[0].match(/ref="(-?\d+)"/)[1]}"/>`); // Close the polygon
    osmElements.push(
      `<way id="${osmIdCounter.way}">${wayNodes.join("")}${tags.join("")}</way>`
    );
    osmIdCounter.way--;
  } else if (feature.geometry.type === "MultiPolygon") {
    // For a MultiPolygon, process each polygon individually
    for (const polygonCoordinates of feature.geometry.coordinates) {
      const wayNodes = [];
      for (const coord of polygonCoordinates[0]) {
        const convertedCoordinates = convertCoordinates(
          coord,
          sourceCRS,
          targetCRS
        );
        osmElements.push(
          `<node id="${osmIdCounter.node}" lat="${convertedCoordinates[1]}" lon="${convertedCoordinates[0]}"/>`
        );
        wayNodes.push(`<nd ref="${osmIdCounter.node}"/>`);
        osmIdCounter.node--;
      }
      wayNodes.push(`<nd ref="${wayNodes[0].match(/ref="(-?\d+)"/)[1]}"/>`); // Close the polygon
      osmElements.push(
        `<way id="${osmIdCounter.way}">${wayNodes.join("")}${tags.join(
          ""
        )}</way>`
      );
      osmIdCounter.way--;
    }
  }
  // ... (Add more geometry types as needed: MultiLineString, MultiPoint, GeometryCollection)

  return osmElements.join("");
}

// This function handles GeoJSON files with various structures
function processGeoJSON(geojson, osmIdCounter, osmWriteStream) {
  let features = [];

  if (geojson.type === "FeatureCollection") {
    if (geojson.features && Array.isArray(geojson.features)) {
      features = geojson.features;
    } else {
      console.error('Invalid GeoJSON format: "features" array is not correct');
      return;
    }
  } else if (geojson.type === "Feature") {
    features = [geojson];
  } else if (
    geojson.type === "Point" ||
    geojson.type === "LineString" ||
    geojson.type === "Polygon" ||
    geojson.type === "MultiPolygon"
  ) {
    features = [{ geometry: geojson, type: "Feature", properties: {} }];
  } else {
    console.error("Unsupported GeoJSON structure or type.");
    return;
  }
  return features;
}

async function main() {
  const startTime = performance.now();

  console.log("Starting GeoJSON to OSM conversion...");

  console.log(`Input GeoJSON file: ${GEOJSON_FILE_PATH}`);
  console.log(`Output OSM file: ${OSM_FILE_PATH}`);
  console.log(`Chunk size: ${MAX_FEATURES_PER_CHUNK}`);
  console.log(`Source CRS: ${SOURCE_CRS}`);
  console.log(`Target CRS: ${TARGET_CRS}`);

  const fileSizeMB = getFileSizeMB(GEOJSON_FILE_PATH);

  // Check if getFileSizeMB returned -1 (file not found)
  if (fileSizeMB === -1) {
    return; // Exit the function if file is not found
  }

  console.log(`GeoJSON file size: ${fileSizeMB.toFixed(2)} MB`);

  // Check if file exists or is empty.
  if (fileSizeMB === 0) {
    console.log("GeoJson file is empty.");
    return;
  }

  const osmIdCounter = { node: -1, way: -1 };
  const osmHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="geojson-to-osm">\n`;
  const osmFooter = "\n</osm>";

  // Use createWriteStream for streaming
  const osmWriteStream = fs.createWriteStream(OSM_FILE_PATH, {
    encoding: "utf-8",
  });
  osmWriteStream.write(osmHeader);

  let currentChunk = [];
  let processedChunks = 0;
  let numChunks = 0;
  let featureCount = 0;
  let globalFeatures = [];
  let linesToSkip = 5; // Number of lines to skip
  let currentLine = 0;
  let linesCounted = 0;

  function countFileLines(filePath) {
    return new Promise((resolve, reject) => {
      let lineCount = 0;
      fs.createReadStream(filePath)
        .on("data", (buffer) => {
          let idx = -1;
          lineCount--; // Because the loop will run once for idx=-1
          do {
            idx = buffer.indexOf(10, idx + 1);
            lineCount++;
          } while (idx !== -1);
        })
        .on("end", () => {
          resolve(lineCount);
        })
        .on("error", reject);
    });
  }

  linesCounted = await countFileLines(GEOJSON_FILE_PATH);
  console.log("Lines in file", linesCounted);

  const geojsonReadStream = fs.createReadStream(GEOJSON_FILE_PATH, {
    encoding: "utf-8",
  });
  const rl = readline.createInterface({
    input: geojsonReadStream,
    crlfDelay: Infinity,
  });

  rl.on("line", async (line) => {
    currentLine++;
    if (currentLine <= linesToSkip) {
      return; // Skip the first linesToSkip lines
    }

    if (currentLine === linesToSkip + 1) {
      if (line.trim().startsWith("{") || line.trim().startsWith("[")) {
        try {
          const json = JSON.parse(line.slice(0, -1));
          const features = processGeoJSON(json, osmIdCounter, osmWriteStream);
          if (features) {
            globalFeatures = features;
          }
        } catch (e) {
          console.error("Invalid GeoJSON format. Incorrect structure.");
          rl.close();
          return;
        }
      } else {
        console.error("Invalid GeoJSON format. Incorrect structure.");
        rl.close();
        return;
      }
      numChunks = Math.ceil(linesCounted / MAX_FEATURES_PER_CHUNK);

      return;
    }

    if (line.trim() === "]") {
      //we are at the end of a feature collection
      isLastLine = true;
    }
    if (line.trim() === "}," || line.trim() === "}") {
      line = line.trim().slice(0, -1);
    }
    if (line.startsWith("{")) {
      line = line.trim();
      if (line.endsWith(",")) {
        line = line.slice(0, -1);
      }
      currentChunk.push(JSON.parse(line));
      featureCount++;
    }

    if (currentChunk.length >= MAX_FEATURES_PER_CHUNK || isLastLine) {
      let featuresToAdd = [];
      if (globalFeatures.length > 0) {
        featuresToAdd = globalFeatures;
        globalFeatures = [];
      } else {
        featuresToAdd = currentChunk;
      }

      for (const feature of featuresToAdd) {
        const osmOutput = geojsonFeatureToOsm(
          feature,
          osmIdCounter,
          SOURCE_CRS,
          TARGET_CRS
        );
        osmWriteStream.write(osmOutput + "\n");
      }
      processedChunks++;
      const progress = ((processedChunks / numChunks) * 100).toFixed(2);
      console.log(
        `Progress: ${progress}% (Chunk ${processedChunks}/${numChunks})`
      );
      currentChunk = [];
      if (isLastLine) {
        isLastLine = false;
      }
    }
  });

  rl.on("close", () => {
    osmWriteStream.write(osmFooter);
    osmWriteStream.end();

    console.log(`Number of chunks: ${numChunks}`);
  });

  geojsonReadStream.on("error", (err) => {
    console.error("An error occurred while reading to the GeoJSON file:", err);
  });

  osmWriteStream.on("finish", () => {
    console.log(`Conversion complete. OSM file saved to: ${OSM_FILE_PATH}`);
    const endTime = performance.now();
    console.log(
      `Total conversion time: ${(endTime - startTime) / 1000} seconds`
    );
  });

  osmWriteStream.on("error", (err) => {
    console.error("An error occurred while writing to the OSM file:", err);
  });
}

main().catch((error) => {
  console.error("An error occurred:", error);
});
