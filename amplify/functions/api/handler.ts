// amplify/functions/api/handler.ts
// Parish Events API Handler

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { 
  Parish, ParishEvent, ParishLocation, Priest, User, ParishMembership,
  PastoralUnit, JsonLdEvent, ParishEventsPublicResponse, EventSchedule, WeekDay 
} from "../../../shared/types";

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.TABLE_NAME!;

type Claims = {
  sub?: string;
  email?: string;
  username?: string;
  "cognito:username"?: string;
  "cognito:groups"?: string | string[];
  [k: string]: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const json = (body: unknown, statusCode = 200): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Extract user identity from JWT
function getUserFromEvent(event: APIGatewayProxyEventV2WithJWTAuthorizer | APIGatewayProxyEventV2) {
  if ('authorizer' in event.requestContext && event.requestContext.authorizer?.jwt) {
    const jwt = event.requestContext.authorizer.jwt;
    const claims = (jwt.claims ?? {}) as Claims;
    
    const sub = claims.sub as string | undefined;
    const username = (claims["cognito:username"] ?? claims.username) as string | undefined;
    const email = claims.email as string | undefined;
    
    return { sub, username, email, authenticated: true };
  }
  
  return { sub: undefined, username: undefined, email: undefined, authenticated: false };
}

// Check if user has permission for parish action
async function checkParishPermission(userId: string, parishId: string, requiredRole: 'admin' | 'manager' | 'viewer' = 'viewer') {
  const result = await dynamodb.send(new GetCommand({
    TableName: tableName,
    Key: { pk: `PARISH#${parishId}`, sk: `MEMBER#${userId}` }
  }));
  
  if (!result.Item) return false;
  
  const role = result.Item.role as string;
  const roleHierarchy = { viewer: 0, manager: 1, admin: 2 };
  
  return roleHierarchy[role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Convert internal event to JSON-LD format
function eventToJsonLd(event: ParishEvent, parish: Parish, location: ParishLocation, celebrant?: Priest, assistants: Priest[] = []): JsonLdEvent {
  const jsonLd: JsonLdEvent = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    location: {
      "@type": "Place",
      name: location.name,
      ...(location.osmNode && { sameAs: `https://www.openstreetmap.org/node/${location.osmNode}` }),
      ...(location.address && {
        address: {
          "@type": "PostalAddress",
          ...(location.address.streetAddress && { streetAddress: location.address.streetAddress }),
          ...(location.address.addressLocality && { addressLocality: location.address.addressLocality }),
          ...(location.address.postalCode && { postalCode: location.address.postalCode }),
          ...(location.address.addressRegion && { addressRegion: location.address.addressRegion }),
          addressCountry: location.address.addressCountry
        }
      })
    }
  };
  
  if (event.description) jsonLd.description = event.description;
  if (event.additionalType) jsonLd.additionalType = event.additionalType;
  if (event.image) jsonLd.image = event.image;
  
  // Add performers (priests)
  const performers = [];
  if (celebrant) {
    performers.push({
      "@type": "Person" as const,
      name: celebrant.name,
      jobTitle: "Main Celebrant"
    });
  }
  assistants.forEach(priest => {
    performers.push({
      "@type": "Person" as const,
      name: priest.name,
      jobTitle: "Assistant"
    });
  });
  if (performers.length > 0) jsonLd.performer = performers;
  
  // Handle scheduling
  if (event.isRecurring && event.schedule) {
    const schedule = event.schedule;
    jsonLd.eventSchedule = {
      "@type": "Schedule",
      byDay: schedule.byDay.map(day => `https://schema.org/${day}`),
      startTime: schedule.startTime,
      ...(schedule.endTime && { endTime: schedule.endTime }),
      repeatFrequency: schedule.repeatFrequency,
      scheduleTimezone: parish.timezone,
      ...(schedule.startDate && { startDate: schedule.startDate }),
      ...(schedule.endDate && { endDate: schedule.endDate }),
      ...(schedule.exceptDates?.length && { exceptDate: schedule.exceptDates })
    };
  } else if (event.specificDate) {
    // For specific date events, we need to construct ISO datetime
    jsonLd.startDate = `${event.specificDate}T${event.schedule?.startTime || '09:00'}:00`;
    if (event.schedule?.endTime) {
      jsonLd.endDate = `${event.specificDate}T${event.schedule.endTime}:00`;
    }
  }
  
  return jsonLd;
}

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  // Handle CORS preflight
  if (event.requestContext.http.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  const user = getUserFromEvent(event);
  const { method, path } = {
    method: event.requestContext.http.method,
    path: event.rawPath,
  };
  
  // Parse request body
  const body = event.body ? 
    (event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body) : "{}";
  const data = method !== "GET" ? JSON.parse(body) : null;

  try {
    // === PUBLIC ROUTES (no auth required) ===
    if (path.startsWith("/public/")) {
      if (method === "GET" && path.startsWith("/public/parish/")) {
        const pathParts = path.split("/");
        const parishId = pathParts[3];
        
        if (pathParts[4] === "events") {
          // GET /public/parish/{id}/events - Public JSON-LD endpoint
          
          // Fetch parish
          const parishResult = await dynamodb.send(new GetCommand({
            TableName: tableName,
            Key: { pk: `PARISH#${parishId}`, sk: "METADATA" }
          }));
          
          if (!parishResult.Item) {
            return json({ error: "Parish not found" }, 404);
          }
          
          const parish = parishResult.Item as Parish;
          
          // Fetch all events for this parish
          const eventsResult = await dynamodb.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
              ":pk": `PARISH#${parishId}`,
              ":sk": "EVENT#"
            }
          }));
          
          const events: JsonLdEvent[] = [];
          
          for (const item of eventsResult.Items || []) {
            const parishEvent = item as ParishEvent;
            
            // Get location
            const locationResult = await dynamodb.send(new GetCommand({
              TableName: tableName,
              Key: { pk: `PARISH#${parishId}`, sk: `LOCATION#${parishEvent.locationId}` }
            }));
            
            if (!locationResult.Item) continue;
            const location = locationResult.Item as ParishLocation;
            
            // Get celebrant and assistants
            let celebrant: Priest | undefined;
            const assistants: Priest[] = [];
            
            if (parishEvent.celebrantId) {
              const celebrantResult = await dynamodb.send(new GetCommand({
                TableName: tableName,
                Key: { pk: `PARISH#${parishId}`, sk: `PRIEST#${parishEvent.celebrantId}` }
              }));
              if (celebrantResult.Item) celebrant = celebrantResult.Item as Priest;
            }
            
            if (parishEvent.assistantIds?.length) {
              for (const assistantId of parishEvent.assistantIds) {
                const assistantResult = await dynamodb.send(new GetCommand({
                  TableName: tableName,
                  Key: { pk: `PARISH#${parishId}`, sk: `PRIEST#${assistantId}` }
                }));
                if (assistantResult.Item) assistants.push(assistantResult.Item as Priest);
              }
            }
            
            events.push(eventToJsonLd(parishEvent, parish, location, celebrant, assistants));
          }
          
          const response: ParishEventsPublicResponse = {
            parish: {
              name: parish.name,
              ...(parish.website && { website: parish.website })
            },
            events,
            generatedAt: new Date().toISOString()
          };
          
          return json(response);
        }
      }
      
      return json({ error: "Public route not found" }, 404);
    }

    // === PRIVATE ROUTES (auth required) ===
    if (!user.authenticated || !user.sub) {
      return json({ error: "Unauthorized" }, 401);
    }

    // User info endpoint
    if (method === "GET" && path === "/whoami") {
      return json({
        ok: true,
        user: {
          id: user.sub,
          username: user.username,
          email: user.email
        }
      });
    }

    // Pastoral Units routes
    if (path.startsWith("/pastoral-units")) {
      const pathParts = path.split("/").filter(Boolean);
      
      if (method === "GET" && pathParts.length === 1) {
        // GET /pastoral-units - List user's pastoral units
        const userParishes = await dynamodb.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": `USER#${user.sub}` }
        }));
        
        const pastoralUnits = new Set<string>();
        for (const item of userParishes.Items || []) {
          if (item.sk.startsWith("MEMBERSHIP#")) {
            const parishId = item.parishId;
            // Get parish to check if it's part of a pastoral unit
            const parishResult = await dynamodb.send(new GetCommand({
              TableName: tableName,
              Key: { pk: `PARISH#${parishId}`, sk: "METADATA" }
            }));
            if (parishResult.Item?.pastoralUnitId) {
              pastoralUnits.add(parishResult.Item.pastoralUnitId);
            }
          }
        }
        
        const units = [];
        for (const unitId of pastoralUnits) {
          const unitResult = await dynamodb.send(new GetCommand({
            TableName: tableName,
            Key: { pk: `PASTORAL_UNIT#${unitId}`, sk: "METADATA" }
          }));
          if (unitResult.Item) units.push(unitResult.Item);
        }
        
        return json(units);
      }
      
      if (method === "POST" && pathParts.length === 1) {
        // POST /pastoral-units - Create pastoral unit
        const unitId = generateId();
        const now = new Date().toISOString();
        
        const pastoralUnit: PastoralUnit = {
          id: unitId,
          name: data.name,
          description: data.description,
          parishes: data.parishes || [],
          sharedPriests: [],
          coordinator: data.coordinator,
          createdAt: now,
          updatedAt: now,
          createdBy: user.sub
        };
        
        // Create pastoral unit record
        await dynamodb.send(new PutCommand({
          TableName: tableName,
          Item: {
            pk: `PASTORAL_UNIT#${unitId}`,
            sk: "METADATA",
            ...pastoralUnit,
            type: "pastoral_unit"
          }
        }));
        
        // Update parishes to link to pastoral unit
        for (const parishId of pastoralUnit.parishes) {
          await dynamodb.send(new UpdateCommand({
            TableName: tableName,
            Key: { pk: `PARISH#${parishId}`, sk: "METADATA" },
            UpdateExpression: "SET pastoralUnitId = :unitId, updatedAt = :now",
            ExpressionAttributeValues: {
              ":unitId": unitId,
              ":now": now
            }
          }));
        }
        
        return json(pastoralUnit);
      }
    }
    
    if (path.startsWith("/pastoral-unit/")) {
      const pathParts = path.split("/").filter(Boolean);
      const unitId = pathParts[1];
      
      if (method === "GET" && pathParts.length === 2) {
        // GET /pastoral-unit/:id - Get pastoral unit details
        const unitResult = await dynamodb.send(new GetCommand({
          TableName: tableName,
          Key: { pk: `PASTORAL_UNIT#${unitId}`, sk: "METADATA" }
        }));
        
        if (!unitResult.Item) {
          return json({ error: "Pastoral unit not found" }, 404);
        }
        
        return json(unitResult.Item);
      }
    }

    // Parish routes
    if (path.startsWith("/parish")) {
      const pathParts = path.split("/").filter(Boolean);
      
      if (method === "GET" && pathParts.length === 1) {
        // GET /parish - List user's parishes
        const result = await dynamodb.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": `USER#${user.sub}`
          }
        }));
        
        const parishes = [];
        for (const item of result.Items || []) {
          if (item.sk.startsWith("MEMBERSHIP#")) {
            const membership = item as ParishMembership & { pk: string; sk: string };
            const parishId = membership.parishId;
            
            // Get parish details
            const parishResult = await dynamodb.send(new GetCommand({
              TableName: tableName,
              Key: { pk: `PARISH#${parishId}`, sk: "METADATA" }
            }));
            
            if (parishResult.Item) {
              parishes.push({
                ...parishResult.Item,
                userRole: membership.role
              });
            }
          }
        }
        
        return json(parishes);
      }
      
      if (method === "POST" && pathParts.length === 1) {
        // POST /parish - Create new parish
        const parishId = generateId();
        const now = new Date().toISOString();
        
        const parish: Parish = {
          id: parishId,
          name: data.name,
          description: data.description,
          website: data.website,
          timezone: data.timezone || "UTC",
          pastoralUnitId: data.pastoralUnitId,
          locations: [],
          priests: [],
          createdAt: now,
          updatedAt: now,
          createdBy: user.sub
        };
        
        // Create parish record
        await dynamodb.send(new PutCommand({
          TableName: tableName,
          Item: {
            pk: `PARISH#${parishId}`,
            sk: "METADATA",
            ...parish,
            type: "parish"
          }
        }));
        
        // Add creator as admin
        const membership: ParishMembership = {
          parishId,
          role: "admin",
          joinedAt: now
        };
        
        await dynamodb.send(new PutCommand({
          TableName: tableName,
          Item: {
            pk: `USER#${user.sub}`,
            sk: `MEMBERSHIP#${parishId}`,
            ...membership,
            type: "membership"
          }
        }));
        
        // Add membership to parish too (for querying)
        await dynamodb.send(new PutCommand({
          TableName: tableName,
          Item: {
            pk: `PARISH#${parishId}`,
            sk: `MEMBER#${user.sub}`,
            userId: user.sub,
            role: "admin",
            joinedAt: now,
            type: "member"
          }
        }));
        
        // If pastoral unit provided, add parish to unit
        if (data.pastoralUnitId) {
          await dynamodb.send(new UpdateCommand({
            TableName: tableName,
            Key: { pk: `PASTORAL_UNIT#${data.pastoralUnitId}`, sk: "METADATA" },
            UpdateExpression: "SET parishes = list_append(if_not_exists(parishes, :empty_list), :parish_id), updatedAt = :now",
            ExpressionAttributeValues: {
              ":parish_id": [parishId],
              ":empty_list": [],
              ":now": now
            }
          }));
        }
        
        return json(parish);
      }
      
      if (pathParts.length >= 2) {
        const parishId = pathParts[1];
        
        // Check user permission for this parish
        if (!await checkParishPermission(user.sub, parishId, 'viewer')) {
          return json({ error: "Access denied" }, 403);
        }
        
        if (method === "GET" && pathParts.length === 2) {
          // GET /parish/:id - Get parish details
          const parishResult = await dynamodb.send(new GetCommand({
            TableName: tableName,
            Key: { pk: `PARISH#${parishId}`, sk: "METADATA" }
          }));
          
          if (!parishResult.Item) {
            return json({ error: "Parish not found" }, 404);
          }
          
          // Get user's role
          const memberResult = await dynamodb.send(new GetCommand({
            TableName: tableName,
            Key: { pk: `PARISH#${parishId}`, sk: `MEMBER#${user.sub}` }
          }));
          
          return json({
            parish: parishResult.Item,
            userRole: memberResult.Item?.role || 'viewer'
          });
        }
        
        // Parish sub-resources (events, locations, priests)
        if (pathParts.length === 3) {
          const resource = pathParts[2];
          
          if (resource === "events") {
            if (method === "GET") {
              // GET /parish/:id/events - List parish events
              const eventsResult = await dynamodb.send(new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
                ExpressionAttributeValues: {
                  ":pk": `PARISH#${parishId}`,
                  ":sk": "EVENT#"
                }
              }));
              
              return json(eventsResult.Items || []);
            }
            
            if (method === "POST") {
              // POST /parish/:id/events - Create event
              if (!await checkParishPermission(user.sub, parishId, 'manager')) {
                return json({ error: "Insufficient permissions" }, 403);
              }
              
              const eventId = generateId();
              const now = new Date().toISOString();
              
              const event: ParishEvent = {
                id: eventId,
                parishId,
                name: data.name,
                description: data.description,
                eventType: data.eventType,
                locationId: data.locationId,
                celebrantId: data.celebrantId,
                assistantIds: data.assistantIds,
                isRecurring: data.isRecurring,
                schedule: data.schedule,
                specificDate: data.specificDate,
                additionalType: data.additionalType,
                image: data.image,
                createdAt: now,
                updatedAt: now,
                createdBy: user.sub
              };
              
              await dynamodb.send(new PutCommand({
                TableName: tableName,
                Item: {
                  pk: `PARISH#${parishId}`,
                  sk: `EVENT#${eventId}`,
                  ...event,
                  type: "event"
                }
              }));
              
              return json(event);
            }
          }
          
          if (resource === "locations") {
            if (method === "GET") {
              // GET /parish/:id/locations - List parish locations
              const locationsResult = await dynamodb.send(new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
                ExpressionAttributeValues: {
                  ":pk": `PARISH#${parishId}`,
                  ":sk": "LOCATION#"
                }
              }));
              
              return json(locationsResult.Items || []);
            }
            
            if (method === "POST") {
              // POST /parish/:id/locations - Create location
              if (!await checkParishPermission(user.sub, parishId, 'manager')) {
                return json({ error: "Insufficient permissions" }, 403);
              }
              
              const locationId = generateId();
              const now = new Date().toISOString();
              
              const location: ParishLocation = {
                id: locationId,
                name: data.name,
                address: data.address,
                osmNode: data.osmNode,
                coordinates: data.coordinates,
                isDefault: data.isDefault
              };
              
              await dynamodb.send(new PutCommand({
                TableName: tableName,
                Item: {
                  pk: `PARISH#${parishId}`,
                  sk: `LOCATION#${locationId}`,
                  ...location,
                  createdAt: now,
                  updatedAt: now,
                  type: "location"
                }
              }));
              
              return json(location);
            }
          }
          
          if (resource === "priests") {
            if (method === "GET") {
              // GET /parish/:id/priests - List parish priests
              const priestsResult = await dynamodb.send(new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
                ExpressionAttributeValues: {
                  ":pk": `PARISH#${parishId}`,
                  ":sk": "PRIEST#"
                }
              }));
              
              return json(priestsResult.Items || []);
            }
            
            if (method === "POST") {
              // POST /parish/:id/priests - Create priest
              if (!await checkParishPermission(user.sub, parishId, 'manager')) {
                return json({ error: "Insufficient permissions" }, 403);
              }
              
              const priestId = generateId();
              const now = new Date().toISOString();
              
              const priest: Priest = {
                id: priestId,
                parishId: parishId,
                title: data.title || 'Father',
                name: data.name,
                preferredName: data.preferredName,
                email: data.email,
                phone: data.phone,
                isParishPriest: data.isParishPriest || false,
                isActive: data.isActive !== false,
                ordainedDate: data.ordainedDate,
                diocese: data.diocese,
                languages: data.languages,
                specialties: data.specialties,
                createdAt: now,
                updatedAt: now,
                createdBy: user.sub
              };
              
              await dynamodb.send(new PutCommand({
                TableName: tableName,
                Item: {
                  pk: `PARISH#${parishId}`,
                  sk: `PRIEST#${priestId}`,
                  ...priest,
                  type: "priest"
                }
              }));
              
              return json(priest);
            }
          }
          
          // Handle priest-specific operations
          if (pathParts.length === 4 && pathParts[2] === "priests") {
            const priestId = pathParts[3];
            
            if (method === "PUT") {
              // PUT /parish/:id/priests/:priestId - Update priest
              if (!await checkParishPermission(user.sub, parishId, 'manager')) {
                return json({ error: "Insufficient permissions" }, 403);
              }
              
              const now = new Date().toISOString();
              
              const updateExpressions = [];
              const attributeNames: Record<string, string> = {};
              const attributeValues: Record<string, any> = {
                ":updatedAt": now
              };
              
              // Build dynamic update expression
              const updatableFields = [
                'title', 'name', 'preferredName', 'email', 'phone', 
                'isParishPriest', 'isActive', 'ordainedDate', 'diocese', 
                'languages', 'specialties'
              ];
              
              updatableFields.forEach(field => {
                if (data[field] !== undefined) {
                  const attrName = `#${field}`;
                  const attrValue = `:${field}`;
                  attributeNames[attrName] = field;
                  attributeValues[attrValue] = data[field];
                  updateExpressions.push(`${attrName} = ${attrValue}`);
                }
              });
              
              updateExpressions.push("#updatedAt = :updatedAt");
              attributeNames["#updatedAt"] = "updatedAt";
              
              const result = await dynamodb.send(new UpdateCommand({
                TableName: tableName,
                Key: { pk: `PARISH#${parishId}`, sk: `PRIEST#${priestId}` },
                UpdateExpression: `SET ${updateExpressions.join(", ")}`,
                ExpressionAttributeNames: attributeNames,
                ExpressionAttributeValues: attributeValues,
                ReturnValues: "ALL_NEW"
              }));
              
              return json(result.Attributes);
            }
            
            if (method === "DELETE") {
              // DELETE /parish/:id/priests/:priestId - Delete priest
              if (!await checkParishPermission(user.sub, parishId, 'admin')) {
                return json({ error: "Insufficient permissions" }, 403);
              }
              
              await dynamodb.send(new DeleteCommand({
                TableName: tableName,
                Key: { pk: `PARISH#${parishId}`, sk: `PRIEST#${priestId}` }
              }));
              
              return json({ success: true });
            }
            
            if (method === "GET") {
              // GET /parish/:id/priests/:priestId - Get specific priest
              const priestResult = await dynamodb.send(new GetCommand({
                TableName: tableName,
                Key: { pk: `PARISH#${parishId}`, sk: `PRIEST#${priestId}` }
              }));
              
              if (!priestResult.Item) {
                return json({ error: "Priest not found" }, 404);
              }
              
              return json(priestResult.Item);
            }
          }
        }
      }
    }

    return json({ error: `Route not found: ${method} ${path}` }, 404);

  } catch (error) {
    console.error("API Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
};