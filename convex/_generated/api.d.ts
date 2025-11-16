/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as bimesters from "../bimesters.js";
import type * as classes from "../classes.js";
import type * as courses from "../courses.js";
import type * as enrollments from "../enrollments.js";
import type * as grades from "../grades.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as professors from "../professors.js";
import type * as programs from "../programs.js";
import type * as reports from "../reports.js";
import type * as students from "../students.js";
import type * as types from "../types.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  bimesters: typeof bimesters;
  classes: typeof classes;
  courses: typeof courses;
  enrollments: typeof enrollments;
  grades: typeof grades;
  helpers: typeof helpers;
  http: typeof http;
  professors: typeof professors;
  programs: typeof programs;
  reports: typeof reports;
  students: typeof students;
  types: typeof types;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
