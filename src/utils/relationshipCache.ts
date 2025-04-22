// Define a type for relationship data
interface RelationshipData {
  status: string;
  [key: string]: unknown;
}

// Cache for relationship data
const relationshipCache: Record<
  string,
  { data: RelationshipData; timestamp: number }
> = {};

// Cache expiration time in milliseconds (5 minutes)
const RELATIONSHIP_CACHE_EXPIRATION = 5 * 60 * 1000;

// Function to check if cached relationship data is still valid
export function isRelationshipCacheValid(targetId: string): boolean {
  if (!relationshipCache[targetId]) return false;

  const now = Date.now();
  const cacheTime = relationshipCache[targetId].timestamp;

  return now - cacheTime < RELATIONSHIP_CACHE_EXPIRATION;
}

// Function to get relationship data from cache
export function getCachedRelationship(
  targetId: string,
): RelationshipData | null {
  if (isRelationshipCacheValid(targetId)) {
    return relationshipCache[targetId].data;
  }
  return null;
}

// Function to store relationship data in cache
export function cacheRelationship(
  targetId: string,
  data: RelationshipData,
): void {
  relationshipCache[targetId] = {
    data,
    timestamp: Date.now(),
  };
}

// Function to remove relationship data from cache
export function removeCachedRelationship(targetId: string): void {
  if (relationshipCache[targetId]) {
    delete relationshipCache[targetId];
  }
}

// Function to clear the entire relationship cache
export function clearRelationshipCache(): void {
  Object.keys(relationshipCache).forEach((key) => {
    delete relationshipCache[key];
  });
}
