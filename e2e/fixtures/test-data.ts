/**
 * Shared test-data helpers used across E2E specs.
 * Each factory appends a timestamp to guarantee uniqueness per run.
 */

const uid = () => Date.now().toString(36);

export function buildProduct(
  overrides: Partial<{
    name: string;
    category: string;
    description: string;
    price: string;
  }> = {}
) {
  const id = uid();
  return {
    name: overrides.name ?? `E2E Product ${id}`,
    category: overrides.category ?? "Electronics",
    description:
      overrides.description ?? `Automated test product created at ${id}`,
    price: overrides.price ?? "49.99",
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
