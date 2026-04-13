const fs = require("fs");
const csv = require("csv-parser");

async function runCSV(input) {
  try {
    // Extract file path from input
    const filePath = input.includes(".csv") 
      ? input.match(/[\w\-\/.\\]+\.csv/i)?.[0]
      : "./data/sample.csv";

    console.log("[CSV] Analyzing file:", filePath);

    if (!fs.existsSync(filePath)) {
      return {
        error: "File not found",
        suggestion: "Please provide a valid CSV file path",
        samplePath: "./data/sample.csv"
      };
    }

    return new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", row => {
          // Clean BOM from keys
          const cleanRow = {};
          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.replace(/^\uFEFF/, ""); // Remove BOM
            cleanRow[cleanKey] = value;
          }
          rows.push(cleanRow);
        })
        .on("end", () => {
          const columns = Object.keys(rows[0] || {});
          
          // Basic statistics
          const stats = {};
          columns.forEach(col => {
            const values = rows.map(r => r[col]).filter(v => v);
            const numbers = values.filter(v => !isNaN(parseFloat(v)));
            
            if (numbers.length > 0) {
              const nums = numbers.map(parseFloat);
              stats[col] = {
                count: nums.length,
                min: Math.min(...nums),
                max: Math.max(...nums),
                avg: (nums.reduce((a,b) => a+b, 0) / nums.length).toFixed(2)
              };
            } else {
              stats[col] = {
                count: values.length,
                unique: [...new Set(values)].length,
                sample: values.slice(0, 3)
              };
            }
          });

          const analysis = {
            rowCount: rows.length,
            columns,
            statistics: stats,
            sample: rows.slice(0, 5)
          };

          console.log(`[CSV] Analyzed ${rows.length} rows, ${columns.length} columns`);
          resolve(analysis);
        })
        .on("error", reject);
    });

  } catch (err) {
    console.error("[CSV] Error:", err.message);
    return {
      error: err.message,
      mockData: {
        rowCount: 100,
        columns: ["date", "product", "sales", "region"],
        note: "This is mock data - provide a real CSV file path"
      }
    };
  }
}

module.exports = { runCSV };
