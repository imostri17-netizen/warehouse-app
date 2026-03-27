"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

const GRID_SIZE = 25;

export default function Home() {
  const [locations, setLocations] = useState([]);
  const [ingresso, setIngresso] = useState(null);
  const [rotation, setRotation] = useState("alta");
  const [selectedLoc, setSelectedLoc] = useState(null);

  const [grid, setGrid] = useState(
    Array(GRID_SIZE)
      .fill(0)
      .map(() => Array(GRID_SIZE).fill(0))
  );

  useEffect(() => {
    fetch("/warehouse.xlsx")
      .then((res) => res.arrayBuffer())
      .then((data) => {
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        const parsed = json.map((row) => ({
          id: row.Location_ID,
          x: Number(row.X_coord),
          y: Number(row.Y_coord),
          type: row.Type,
          zone: row.Zone,
        }));

        setLocations(parsed);
      });
  }, []);

  const ingressi = locations.filter((l) => l.type === "INGRESSO");
  const storage = locations.filter((l) => l.type === "STORAGE");

  function findBestLocation() {
    if (!ingresso) return;

    const start = locations.find((l) => l.id === ingresso);
    if (!start) return;

    let candidates = storage;

    if (rotation === "alta") {
      candidates = storage.filter((l) => l.zone === "A");
    } else if (rotation === "media") {
      candidates = storage.filter((l) => l.zone === "B");
    } else {
      candidates = storage.filter((l) => l.zone === "C");
    }

    if (candidates.length === 0) return;

    let best = candidates[0];
    let bestDist = Infinity;

    candidates.forEach((c) => {
      const dist = Math.sqrt(
        Math.pow(c.x - start.x, 2) + Math.pow(c.y - start.y, 2)
      );

      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    });

    updateDensity(start, best);
    setSelectedLoc(best);
  }

  function updateDensity(start, end) {
    setGrid((prev) => {
      const newGrid = prev.map((r) => [...r]);

      const steps = 15;
      for (let i = 0; i <= steps; i++) {
        const x = start.x + ((end.x - start.x) * i) / steps;
        const y = start.y + ((end.y - start.y) * i) / steps;

        const gx = Math.floor((x / 100) * GRID_SIZE);
        const gy = Math.floor((y / 100) * GRID_SIZE);

        if (newGrid[gy] && newGrid[gy][gx] !== undefined) {
          newGrid[gy][gx] += 1;
        }
      }

      return newGrid;
    });
  }

  function reset() {
    setSelectedLoc(null);
    setIngresso(null);
    setGrid(
      Array(GRID_SIZE)
        .fill(0)
        .map(() => Array(GRID_SIZE).fill(0))
    );
  }

  const maxDensity = Math.max(...grid.flat(), 1);

  return (
    <main style={{ padding: 20 }}>
      <h1>📦 WMS Smart Allocator</h1>

      <h3>Ingresso:</h3>
      {ingressi.map((i) => (
        <button
          key={i.id}
          onClick={() => setIngresso(i.id)}
          style={{
            marginRight: 10,
            padding: 10,
            background: ingresso === i.id ? "black" : "#ccc",
            color: ingresso === i.id ? "white" : "black",
          }}
        >
          {i.id}
        </button>
      ))}

      <h3 style={{ marginTop: 20 }}>Rotazione:</h3>
      {["alta", "media", "bassa"].map((r) => (
        <button
          key={r}
          onClick={() => setRotation(r)}
          style={{
            marginRight: 10,
            padding: 10,
            background: rotation === r ? "black" : "#ccc",
            color: rotation === r ? "white" : "black",
          }}
        >
          {r}
        </button>
      ))}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={findBestLocation}
          style={{ padding: 10, marginRight: 10 }}
        >
          Calcola
        </button>

        <button onClick={reset} style={{ padding: 10 }}>
          Reset
        </button>
      </div>

      {selectedLoc && (
        <h2>
          👉 Vai in: <b>{selectedLoc.id}</b> (Zona {selectedLoc.zone})
        </h2>
      )}

      <div style={{ position: "relative", width: "100%", maxWidth: 1000 }}>
        <img src="/map.png" style={{ width: "100%" }} />

        {grid.map((row, y) =>
          row.map((value, x) => {
            if (value === 0) return null;

            const intensity = value / maxDensity;
            
const OFFSET_X = 2;   // sposta a destra/sinistra
const OFFSET_Y = -2;   // sposta su/giù
const SCALE_X = 0.95; // comprime/allarga orizzontale
const SCALE_Y = 0.95; // comprime/allarga verticale
            
            return (
              <div
                key={`${x}-${y}`}
                style={{
                  position: "absolute",
                  left: `${((x / GRID_SIZE) * 100) * SCALE_X + OFFSET_X}%`,
                  top: `${((y / GRID_SIZE) * 100) * SCALE_Y + OFFSET_Y}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  background: `rgba(255,0,0,${intensity * 0.6})`,
                }}
              />
            );
          })
        )}
      </div>
    </main>
  );
}
