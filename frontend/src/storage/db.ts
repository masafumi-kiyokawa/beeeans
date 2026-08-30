import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Bean, BrewLog, PourStep, Recipe } from "../types";

interface BeansDB extends DBSchema {
  recipes: {
    key: string;
    value: Recipe;
  };
  pourSteps: {
    key: string;
    value: PourStep;
    indexes: { "by-recipe": string };
  };
  brewLogs: {
    key: string;
    value: BrewLog;
    indexes: { "by-recipe": string };
  };
  beans: {
    key: string;
    value: Bean;
  };
}

let dbPromise: Promise<IDBPDatabase<BeansDB>> | undefined;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<BeansDB>("beans", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("recipes", { keyPath: "id" });
          db.createObjectStore("pourSteps", { keyPath: "id" }).createIndex(
            "by-recipe",
            "recipe_id",
          );
          db.createObjectStore("brewLogs", { keyPath: "id" }).createIndex("by-recipe", "recipe_id");
        }
        if (oldVersion < 2) {
          db.createObjectStore("beans", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}
