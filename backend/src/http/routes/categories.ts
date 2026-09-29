import {
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  updateCategoryRequestSchema,
} from "@solvia/contracts";
import { Hono } from "hono";
import type { CategoryService } from "../../modules/categories/category-service.ts";
import { categoryToJson } from "../mappers/category.ts";
import { validate } from "../validation.ts";

export function categoryRoutes(service: CategoryService) {
  return new Hono()
    .get("/", validate("query", listCategoriesQuerySchema), (c) => {
      const items = service.list(c.req.valid("query")).map(categoryToJson);
      return c.json({ items }, 200);
    })
    .post("/", validate("json", createCategoryRequestSchema), (c) => {
      const record = service.create(c.req.valid("json"));
      return c.json(categoryToJson(record), 201);
    })
    .get("/:id", (c) => c.json(categoryToJson(service.get(c.req.param("id"))), 200))
    .patch("/:id", validate("json", updateCategoryRequestSchema), (c) => {
      const record = service.update(c.req.param("id"), c.req.valid("json"));
      return c.json(categoryToJson(record), 200);
    })
    .post("/:id/archive", (c) => c.json(categoryToJson(service.archive(c.req.param("id"))), 200))
    .post("/:id/unarchive", (c) =>
      c.json(categoryToJson(service.unarchive(c.req.param("id"))), 200),
    )
    .delete("/:id", (c) => {
      service.delete(c.req.param("id"));
      return c.body(null, 204);
    });
}
