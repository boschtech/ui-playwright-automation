/**
 * Shared test-data helpers used across E2E specs.
 * Each factory appends a timestamp to guarantee uniqueness per run.
 */

// Build a unique-per-call id. `fullyParallel` runs several workers, so two
// `buildProduct()` calls can land in the same millisecond across workers.
// Combine a timestamp with a monotonic per-process counter and a random
// suffix so generated names never collide (which would otherwise cause
// strict-mode locator violations on shared `getProductCard`/`getProductLink`).
let counter = 0;
const uid = () =>
  `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

export function buildProduct(
  overrides: Partial<{
    name: string;
    category: string;
    description: string;
    price: string;
    stock: "In Stock" | "Out of Stock";
  }> = {}
) {
  const id = uid();
  return {
    name: overrides.name ?? `E2E Product ${id}`,
    category: overrides.category ?? "Electronics",
    description:
      overrides.description ?? `Automated test product created at ${id}`,
    price: overrides.price ?? "49.99",
    stock: overrides.stock,
  };
}

export function buildOrder(
  overrides: Partial<{
    quantity: string;
  }> = {}
) {
  return {
    quantity: overrides.quantity ?? "2",
  };
}
