import boards from "./hardware-images.json";
export { boards };
export function hardwareImageFor(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return boards.find((board) => [board.name, board.id, board.model].some((value) => value.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized));
}
