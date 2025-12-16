const fs = require("fs");
const path = require("path");

const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) {
  console.error("GOOGLE_MAPS_API_KEY environment variable is not set.");
  process.exit(1);
}

const indexPath = path.join(__dirname, "..", "www", "index.html");

if (!fs.existsSync(indexPath)) {
  console.error(`index.html not found at ${indexPath}`);
  process.exit(1);
}

let content = fs.readFileSync(indexPath, "utf8");

if (!content.includes("__GOOGLE_MAPS_API_KEY__")) {
  console.error("Placeholder __GOOGLE_MAPS_API_KEY__ not found in index.html");
  process.exit(1);
}

content = content.replace("__GOOGLE_MAPS_API_KEY__", key);
fs.writeFileSync(indexPath, content, "utf8");

console.log("Google Maps API key injected into www/index.html");
