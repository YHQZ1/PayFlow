import "dotenv/config";
import express from "express";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specsDir = path.join(__dirname, "../../openapi");
const PORT = process.env.PORT || 5000;

const app = express();

// Load all YAML specs
const specs = {};
const specFiles = fs.readdirSync(specsDir).filter((f) => f.endsWith(".yaml"));

for (const file of specFiles) {
  const name = file.replace(".yaml", "");
  specs[name] = yaml.load(fs.readFileSync(path.join(specsDir, file), "utf8"));
}

const serviceNames = Object.keys(specs);

// Swagger UI options
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    urls: serviceNames.map((name) => ({
      url: `/specs/${name}.json`,
      name: specs[name].info?.title ?? name,
    })),
    urlsCurrentIndex: 0,
  },
};

// Serve each spec as JSON (Swagger UI fetches these)
app.get("/specs/:name.json", (req, res) => {
  const name = req.params.name;
  if (!specs[name]) return res.status(404).json({ error: "spec not found" });
  res.json(specs[name]);
});

// Serve specs list
app.get("/specs", (req, res) => {
  res.json(
    serviceNames.map((name) => ({
      name,
      title: specs[name].info?.title,
      version: specs[name].info?.version,
      url: `/specs/${name}.json`,
    })),
  );
});

// Serve Swagger UI
app.use("/", swaggerUi.serve, swaggerUi.setup(null, swaggerOptions));

app.listen(PORT, () => {
  console.log(`PayFlow API Docs running at http://localhost:${PORT}`);
  console.log(`Serving ${serviceNames.length} specs:`);
  serviceNames.forEach((n) =>
    console.log(`  - ${specs[n].info?.title} → /specs/${n}.json`),
  );
});
